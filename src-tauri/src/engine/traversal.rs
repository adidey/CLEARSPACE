use crate::engine::size_calculator::{categorize_path, get_kind};
use crate::models::file::{FileMetadata, RiskClassification, StorageCategory, StorageItem};
use crate::models::scan::{ScanOptions, ScanProgress, ScanStatus};
use chrono::{DateTime, Utc};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub struct ScanContext {
    pub cancel_flag: Arc<AtomicBool>,
    pub options: ScanOptions,
    pub start_time: Instant,
    pub files_scanned: u64,
    pub bytes_analysed: u64,
    pub restricted_paths: Vec<String>,
    pub seen_inodes: HashSet<(u64, u64)>, // (dev, ino) to prevent hardlink double-counting
    pub category_bytes: HashMap<String, (u64, u64)>, // Category name -> (size_bytes, item_count)
    pub top_items: Vec<StorageItem>,
}

impl ScanContext {
    pub fn new(options: ScanOptions, cancel_flag: Arc<AtomicBool>) -> Self {
        Self {
            cancel_flag,
            options,
            start_time: Instant::now(),
            files_scanned: 0,
            bytes_analysed: 0,
            restricted_paths: Vec::new(),
            seen_inodes: HashSet::new(),
            category_bytes: HashMap::new(),
            top_items: Vec::new(),
        }
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel_flag.load(Ordering::Relaxed)
    }

    pub fn is_excluded(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        for excluded in &self.options.excluded_folders {
            let expanded = expand_tilde(excluded);
            if path_str == expanded || path_str.starts_with(&format!("{}/", expanded)) {
                return true;
            }
        }
        false
    }
}

pub fn expand_tilde(path_str: &str) -> String {
    if path_str == "~" || path_str.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return format!("{}{}", home, &path_str[1..]);
        }
    }
    path_str.to_string()
}

pub fn format_iso_time(time_secs: i64) -> String {
    if let Some(dt) = DateTime::from_timestamp(time_secs, 0) {
        dt.to_rfc3339()
    } else {
        Utc::now().to_rfc3339()
    }
}

/// Recursively traverses a directory and returns the root `StorageItem`
pub fn scan_directory_tree<F>(
    dir_path: &Path,
    ctx: &mut ScanContext,
    current_depth: usize,
    progress_callback: &F,
) -> Result<StorageItem, String>
where
    F: Fn(ScanProgress),
{
    if ctx.is_cancelled() {
        return Err("Scan cancelled by user.".to_string());
    }

    let meta = match fs::symlink_metadata(dir_path) {
        Ok(m) => m,
        Err(e) => {
            ctx.restricted_paths.push(dir_path.to_string_lossy().to_string());
            return Err(format!("Cannot read metadata for {:?}: {}", dir_path, e));
        }
    };

    let dir_name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir_path.to_string_lossy().to_string());

    let (category, type_label) = categorize_path(dir_path, true);
    let last_modified = format_iso_time(meta.mtime());

    let mut children = Vec::new();
    let mut total_dir_size: u64 = 0;
    let mut total_item_count: u64 = 0;

    let entries = match fs::read_dir(dir_path) {
        Ok(entries) => entries,
        Err(e) => {
            ctx.restricted_paths.push(dir_path.to_string_lossy().to_string());
            // Downgrade to trace for known macOS system-protected prefixes — these
            // are always inaccessible without SIP disabled and produce no useful signal.
            let path_str = dir_path.to_string_lossy();
            let is_system_protected = path_str.starts_with("/System/")
                || path_str.starts_with("/private/var/")
                || path_str.starts_with("/private/etc/")
                || path_str.starts_with("/System/Volumes/")
                || path_str == "/System"
                || path_str == "/private";
            if is_system_protected {
                log::trace!("Skipping protected macOS system path {:?}: {}", dir_path, e);
            } else {
                log::warn!("Permission denied / inaccessible path {:?}: {}", dir_path, e);
            }
            // Return empty directory representation rather than aborting whole scan
            return Ok(StorageItem {
                metadata: FileMetadata {
                    id: format!("dir-{}", uuid::Uuid::new_v4()),
                    name: dir_name.clone(),
                    path: dir_path.to_string_lossy().to_string(),
                    size_bytes: 0,
                    kind: "directory".to_string(),
                    file_type_label: type_label.to_string(),
                    last_modified,
                    category,
                    risk: RiskClassification::HighRisk,
                    associated_project: None,
                    detection_reason: format!("Directory (Inaccessible: {})", e),
                    regeneration_instructions: None,
                    recovery_command: None,
                    cleanup_impact: "Directory could not be fully read due to permissions.".to_string(),
                    item_count: Some(0),
                    is_hidden: Some(dir_name.starts_with('.')),
                    is_symlink: Some(meta.file_type().is_symlink()),
                },
                children: Some(Vec::new()),
            });
        }
    };

    let check_max_depth = ctx.options.max_depth.map(|d| current_depth >= d).unwrap_or(false);

    for entry_res in entries {
        if ctx.is_cancelled() {
            return Err("Scan cancelled by user.".to_string());
        }

        let entry = match entry_res {
            Ok(e) => e,
            Err(_) => continue,
        };

        let child_path = entry.path();
        let child_name = entry.file_name().to_string_lossy().to_string();

        // Hidden files check
        if !ctx.options.include_hidden_files && child_name.starts_with('.') {
            continue;
        }

        // Excluded check
        if ctx.is_excluded(&child_path) {
            continue;
        }

        let child_meta = match fs::symlink_metadata(&child_path) {
            Ok(m) => m,
            Err(e) => {
                ctx.restricted_paths.push(child_path.to_string_lossy().to_string());
                log::debug!("Error reading symlink metadata for {:?}: {}", child_path, e);
                continue;
            }
        };

        let is_symlink = child_meta.file_type().is_symlink();
        let is_dir = child_meta.is_dir() && !is_symlink;

        ctx.files_scanned += 1;

        // Periodic progress emission
        if ctx.files_scanned.is_multiple_of(150) {
            progress_callback(ScanProgress {
                status: ScanStatus::Scanning,
                percent_complete: 0,
                current_directory: child_path.to_string_lossy().to_string(),
                files_scanned: ctx.files_scanned,
                bytes_analysed: ctx.bytes_analysed,
                elapsed_ms: ctx.start_time.elapsed().as_millis() as u64,
                error_message: None,
                error_code: None,
                restricted_paths: None,
            });
        }

        if is_dir {
            if check_max_depth {
                // If max depth reached, record basic directory metadata without recursing
                let (cat, label) = categorize_path(&child_path, true);
                let item = StorageItem {
                    metadata: FileMetadata {
                        id: format!("dir-{}", uuid::Uuid::new_v4()),
                        name: child_name.clone(),
                        path: child_path.to_string_lossy().to_string(),
                        size_bytes: 0,
                        kind: "directory".to_string(),
                        file_type_label: label.to_string(),
                        last_modified: format_iso_time(child_meta.mtime()),
                        category: cat,
                        risk: RiskClassification::HighRisk,
                        associated_project: None,
                        detection_reason: "Folder (Max scan depth reached)".to_string(),
                        regeneration_instructions: None,
                        recovery_command: None,
                        cleanup_impact: "Folder not traversed due to depth limit.".to_string(),
                        item_count: Some(0),
                        is_hidden: Some(child_name.starts_with('.')),
                        is_symlink: Some(false),
                    },
                    children: Some(Vec::new()),
                };
                total_item_count += 1;
                children.push(item);
            } else {
                match scan_directory_tree(&child_path, ctx, current_depth + 1, progress_callback) {
                    Ok(child_tree) => {
                        total_dir_size += child_tree.metadata.size_bytes;
                        total_item_count += child_tree.metadata.item_count.unwrap_or(1) + 1;
                        children.push(child_tree);
                    }
                    Err(e) if e == "Scan cancelled by user." => return Err(e),
                    Err(e) => {
                        log::warn!("Failed child tree scan: {}", e);
                    }
                }
            }
        } else {
            // File or symlink
            let file_size = child_meta.len();
            let inode_key = (child_meta.dev(), child_meta.ino());

            let mut already_counted = false;
            if child_meta.nlink() > 1 {
                if ctx.seen_inodes.contains(&inode_key) {
                    already_counted = true;
                } else {
                    ctx.seen_inodes.insert(inode_key);
                }
            }

            let effective_size = if already_counted { 0 } else { file_size };
            ctx.bytes_analysed += effective_size;
            total_dir_size += effective_size;
            total_item_count += 1;

            let (cat, label) = categorize_path(&child_path, false);
            let kind = get_kind(&child_path, false, is_symlink);

            let cat_key = match cat {
                StorageCategory::DeveloperFiles => "Developer Files",
                StorageCategory::Applications => "Applications",
                StorageCategory::SystemData => "System Data",
                StorageCategory::Documents => "Documents",
                StorageCategory::Media => "Media",
                StorageCategory::Other => "Other",
            };
            let entry = ctx.category_bytes.entry(cat_key.to_string()).or_insert((0, 0));
            entry.0 += effective_size;
            entry.1 += 1;

            let file_item = StorageItem {
                metadata: FileMetadata {
                    id: format!("file-{}", uuid::Uuid::new_v4()),
                    name: child_name.clone(),
                    path: child_path.to_string_lossy().to_string(),
                    size_bytes: file_size,
                    kind: kind.to_string(),
                    file_type_label: label.to_string(),
                    last_modified: format_iso_time(child_meta.mtime()),
                    category: cat,
                    risk: RiskClassification::LowRisk,
                    associated_project: None,
                    detection_reason: format!("File ({})", label),
                    regeneration_instructions: None,
                    recovery_command: None,
                    cleanup_impact: "Individual file item.".to_string(),
                    item_count: Some(1),
                    is_hidden: Some(child_name.starts_with('.')),
                    is_symlink: Some(is_symlink),
                },
                children: None,
            };

            // Keep top largest files
            if file_size > 50 * 1024 * 1024 { // > 50MB
                ctx.top_items.push(file_item.clone());
            }

            // Only add individual files to the directory tree if depth is reasonable or file is significant (>100KB)
            if current_depth <= 4 || file_size >= 100 * 1024 {
                children.push(file_item);
            }
        }
    }

    // Sort children by size descending for responsive rendering
    children.sort_by_key(|a| std::cmp::Reverse(a.metadata.size_bytes));

    let is_root_or_top = current_depth == 0;
    let detection_reason = if is_root_or_top {
        format!("Scanned root directory: {}", dir_path.display())
    } else {
        format!("Directory: {}", dir_name)
    };

    let dir_item = StorageItem {
        metadata: FileMetadata {
            id: format!("dir-{}", uuid::Uuid::new_v4()),
            name: dir_name.clone(),
            path: dir_path.to_string_lossy().to_string(),
            size_bytes: total_dir_size,
            kind: get_kind(dir_path, true, false).to_string(),
            file_type_label: type_label.to_string(),
            last_modified,
            category,
            risk: RiskClassification::HighRisk,
            associated_project: None,
            detection_reason,
            regeneration_instructions: None,
            recovery_command: None,
            cleanup_impact: "Contains files and subdirectories.".to_string(),
            item_count: Some(total_item_count),
            is_hidden: Some(dir_name.starts_with('.')),
            is_symlink: Some(meta.file_type().is_symlink()),
        },
        children: Some(children),
    };

    // If it's a significant folder (> 200MB), consider for top consumers
    if total_dir_size > 200 * 1024 * 1024 {
        ctx.top_items.push(StorageItem {
            metadata: dir_item.metadata.clone(),
            children: None,
        });
    }

    Ok(dir_item)
}

/// Helper to get volume capacity and available space on macOS
pub fn get_volume_info(path: &Path) -> (u64, u64, u64, String, String) {
    let path_c = match std::ffi::CString::new(path.to_string_lossy().as_bytes()) {
        Ok(c) => c,
        Err(_) => return (500_000_000_000, 250_000_000_000, 250_000_000_000, "Macintosh HD".to_string(), "APFS".to_string()),
    };

    let mut stat: libc::statfs = unsafe { std::mem::zeroed() };
    let res = unsafe { libc::statfs(path_c.as_ptr(), &mut stat) };

    if res == 0 {
        let block_size = stat.f_bsize as u64;
        let total_blocks = stat.f_blocks;
        let avail_blocks = stat.f_bavail;

        let total_bytes = total_blocks * block_size;
        let available_bytes = avail_blocks * block_size;
        let used_bytes = total_bytes.saturating_sub(available_bytes);

        let vol_name = unsafe {
            std::ffi::CStr::from_ptr(stat.f_mntonname.as_ptr())
                .to_string_lossy()
                .to_string()
        };
        let fstypename = unsafe {
            std::ffi::CStr::from_ptr(stat.f_fstypename.as_ptr())
                .to_string_lossy()
                .to_string()
        };

        (total_bytes, used_bytes, available_bytes, vol_name, fstypename)
    } else {
        (500_000_000_000, 250_000_000_000, 250_000_000_000, "Macintosh HD".to_string(), "APFS".to_string())
    }
}
