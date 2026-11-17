use crate::engine::detection::DetectionEngine;
use crate::engine::recommendations::RecommendationEngine;
use crate::engine::size_calculator::{categorize_path, get_kind};
use crate::engine::traversal::{
    expand_tilde, format_iso_time, get_volume_info, scan_directory_tree, ScanContext,
};
use crate::models::file::{FileMetadata, RiskClassification, StorageCategory};
use crate::models::scan::{CategorySummary, ScanOptions, ScanProgress, ScanResult, ScanStatus};
use crate::persistence::database::DatabaseManager;
use chrono::Utc;
use std::collections::HashMap;
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct ScannerState {
    pub active_scans: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl Default for ScannerState {
    fn default() -> Self {
        Self {
            active_scans: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// Native macOS folder picker using osascript with argv parameter passing
#[tauri::command]
pub fn pick_scan_directory(default_path: Option<String>) -> Result<Option<String>, String> {
    let starting_folder = default_path
        .map(|p| expand_tilde(&p))
        .unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
        });

    let output = Command::new("osascript")
        .arg("-e")
        .arg("on run argv")
        .arg("-e")
        .arg("try")
        .arg("-e")
        .arg("set defLoc to POSIX file (item 1 of argv)")
        .arg("-e")
        .arg("set chosen to choose folder with prompt \"Select directory to scan with CLEARSPACE\" default location defLoc")
        .arg("-e")
        .arg("return POSIX path of chosen")
        .arg("-e")
        .arg("on error")
        .arg("-e")
        .arg("try")
        .arg("-e")
        .arg("set chosen to choose folder with prompt \"Select directory to scan with CLEARSPACE\"")
        .arg("-e")
        .arg("return POSIX path of chosen")
        .arg("-e")
        .arg("on error")
        .arg("-e")
        .arg("return \"\"")
        .arg("-e")
        .arg("end try")
        .arg("-e")
        .arg("end try")
        .arg("-e")
        .arg("end run")
        .arg(&starting_folder)
        .output()
        .map_err(|e| format!("Failed to execute folder picker dialog: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path_str.is_empty() {
        Ok(None)
    } else {
        // Remove trailing slash if present (except root)
        let cleaned = if path_str.len() > 1 && path_str.ends_with('/') {
            path_str[..path_str.len() - 1].to_string()
        } else {
            path_str
        };
        Ok(Some(cleaned))
    }
}

/// Cancels an active scan by its scan ID, or all scans if none specified
#[tauri::command]
pub fn cancel_scan(
    state: State<'_, ScannerState>,
    scan_id: Option<String>,
) -> Result<(), String> {
    let scans = state.active_scans.lock().unwrap();
    if let Some(id) = scan_id {
        if let Some(flag) = scans.get(&id) {
            flag.store(true, Ordering::SeqCst);
            log::info!("Scan cancellation requested for scan_id: {}", id);
        }
    } else {
        for flag in scans.values() {
            flag.store(true, Ordering::SeqCst);
        }
        log::info!("All active scans cancelled.");
    }
    Ok(())
}

fn perform_scan_sync(
    app: AppHandle,
    scan_id: String,
    target_path: PathBuf,
    raw_target: String,
    options: ScanOptions,
    cancel_flag: Arc<AtomicBool>,
) -> Result<ScanResult, String> {
    let start_instant = std::time::Instant::now();
    let scanned_at = Utc::now().to_rfc3339();

    let (total_capacity, used_bytes_vol, available_bytes, vol_name, fstypename) =
        get_volume_info(&target_path);

    let app_handle = app.clone();
    let mut ctx = ScanContext::new(options.clone(), cancel_flag);

    // Initial progress event
    let _ = app.emit(
        "clearspace://scan-progress",
        ScanProgress {
            status: ScanStatus::Scanning,
            percent_complete: 2,
            current_directory: raw_target.clone(),
            target_directory: Some(raw_target.clone()),
            files_scanned: 0,
            bytes_analysed: 0,
            elapsed_ms: 0,
            error_message: None,
            error_code: None,
            restricted_paths: None,
        },
    );

    let progress_callback = move |p: ScanProgress| {
        let _ = app_handle.emit("clearspace://scan-progress", p);
    };

    let root_item = scan_directory_tree(&target_path, &mut ctx, 0, &progress_callback)?;

    let elapsed_sec = start_instant.elapsed().as_secs_f64();
    let total_scanned_bytes = root_item.metadata.size_bytes;

    // Calculate category breakdown
    let all_categories = [
        StorageCategory::DeveloperFiles,
        StorageCategory::Applications,
        StorageCategory::SystemData,
        StorageCategory::Documents,
        StorageCategory::Media,
        StorageCategory::Other,
    ];

    let mut category_summaries = Vec::new();
    for cat in all_categories {
        let cat_label = match cat {
            StorageCategory::DeveloperFiles => "Developer Files",
            StorageCategory::Applications => "Applications",
            StorageCategory::SystemData => "System Data",
            StorageCategory::Documents => "Documents",
            StorageCategory::Media => "Media",
            StorageCategory::Other => "Other",
        };

        let (bytes, count) = ctx
            .category_bytes
            .get(cat_label)
            .copied()
            .unwrap_or((0, 0));

        let pct_used = if total_scanned_bytes > 0 {
            (bytes as f64 / total_scanned_bytes as f64) * 100.0
        } else {
            0.0
        };

        let pct_total = if total_capacity > 0 {
            (bytes as f64 / total_capacity as f64) * 100.0
        } else {
            0.0
        };

        category_summaries.push(CategorySummary {
            category: cat,
            size_bytes: bytes,
            percentage_of_used: pct_used,
            percentage_of_total: pct_total,
            item_count: count,
        });
    }

    // Top consumers
    let mut top_consumers = ctx.top_items;
    top_consumers.sort_by_key(|a| std::cmp::Reverse(a.metadata.size_bytes));
    top_consumers.truncate(15);

    // Largest directory
    let (largest_dir_path, largest_dir_bytes) = if let Some(children) = &root_item.children {
        children
            .iter()
            .filter(|c| c.metadata.kind == "directory")
            .max_by_key(|c| c.metadata.size_bytes)
            .map(|c| (c.metadata.path.clone(), c.metadata.size_bytes))
            .unwrap_or((root_item.metadata.path.clone(), total_scanned_bytes))
    } else {
        (root_item.metadata.path.clone(), total_scanned_bytes)
    };

    // Final completed progress event
    let _ = app.emit(
        "clearspace://scan-progress",
        ScanProgress {
            status: if total_scanned_bytes == 0 {
                ScanStatus::Empty
            } else {
                ScanStatus::Completed
            },
            percent_complete: 100,
            current_directory: raw_target.clone(),
            target_directory: Some(raw_target.clone()),
            files_scanned: ctx.files_scanned,
            bytes_analysed: ctx.bytes_analysed,
            elapsed_ms: start_instant.elapsed().as_millis() as u64,
            error_message: None,
            error_code: None,
            restricted_paths: if ctx.restricted_paths.is_empty() {
                None
            } else {
                Some(ctx.restricted_paths)
            },
        },
    );

    // Run modular developer artifact detection
    let artifacts = DetectionEngine::detect_artifacts(&root_item);

    // Generate evidence-based cleanup recommendations
    let recommendations = RecommendationEngine::generate_recommendations(&artifacts);

    let recoverable_bytes: u64 = recommendations
        .iter()
        .filter(|r| r.risk == RiskClassification::VerifiedSafe || r.risk == RiskClassification::LowRisk)
        .map(|r| r.size_bytes)
        .sum();

    Ok(ScanResult {
        id: scan_id,
        is_mock_data: false,
        data_source_label: "Native Disk".to_string(),
        volume_name: vol_name,
        volume_format: fstypename,
        mount_point: raw_target,
        scanned_at,
        scan_duration_seconds: elapsed_sec,
        total_capacity_bytes: total_capacity,
        used_bytes: used_bytes_vol,
        available_bytes,
        recoverable_bytes,
        largest_directory_path: largest_dir_path,
        largest_directory_bytes: largest_dir_bytes,
        categories: category_summaries,
        root_item,
        top_consumers,
        artifacts,
        recommendations,
    })
}

#[tauri::command]
pub async fn scan_directory(
    app: AppHandle,
    state: State<'_, ScannerState>,
    db: State<'_, DatabaseManager>,
    options: ScanOptions,
) -> Result<ScanResult, String> {
    let scan_id = format!("scan-native-{}", uuid::Uuid::new_v4());
    let cancel_flag = Arc::new(AtomicBool::new(false));

    // Register active scan
    {
        let mut scans = state.active_scans.lock().unwrap();
        scans.insert(scan_id.clone(), cancel_flag.clone());
    }

    let raw_target = expand_tilde(&options.target_path);
    let target_path_buf = PathBuf::from(&raw_target);

    if !target_path_buf.exists() {
        let mut scans = state.active_scans.lock().unwrap();
        scans.remove(&scan_id);
        return Err(format!("Target directory does not exist: {}", raw_target));
    }
    if !target_path_buf.is_dir() {
        let mut scans = state.active_scans.lock().unwrap();
        scans.remove(&scan_id);
        return Err(format!("Target path is not a directory: {}", raw_target));
    }

    let app_handle = app.clone();
    let scan_id_copy = scan_id.clone();
    let cancel_flag_clone = cancel_flag.clone();
    let options_clone = options.clone();
    let raw_target_copy = raw_target.clone();

    // Execute synchronous heavy traversal in Tauri's blocking threadpool
    let scan_result = tauri::async_runtime::spawn_blocking(move || {
        perform_scan_sync(
            app_handle,
            scan_id_copy,
            target_path_buf,
            raw_target_copy,
            options_clone,
            cancel_flag_clone,
        )
    })
    .await
    .map_err(|e| format!("Scan task panicked: {}", e))??;

    // Unregister active scan
    {
        let mut scans = state.active_scans.lock().unwrap();
        scans.remove(&scan_id);
    }

    // Persist to local SQLite
    let _ = db.save_scan(&scan_result);

    Ok(scan_result)
}

#[tauri::command]
pub fn inspect_filesystem_item(path: String) -> Result<FileMetadata, String> {
    let expanded = expand_tilde(&path);
    let p = Path::new(&expanded);

    if !p.exists() {
        return Err(format!("File or directory not found: {}", expanded));
    }

    let sym_meta = fs::symlink_metadata(p)
        .map_err(|e| format!("Could not read filesystem metadata: {}", e))?;

    let is_symlink = sym_meta.file_type().is_symlink();
    let is_dir = sym_meta.is_dir() && !is_symlink;
    let file_name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| expanded.clone());

    let (category, _) = categorize_path(p, is_dir);
    let kind = get_kind(p, is_dir, is_symlink);

    let size_bytes = if is_dir {
        0
    } else {
        sym_meta.len()
    };

    let modified = format_iso_time(sym_meta.mtime());
    let file_type_label = match (is_dir, is_symlink) {
        (true, _) => "Directory".to_string(),
        (_, true) => "Symbolic Link".to_string(),
        _ => p
            .extension()
            .map(|e| format!("{} File", e.to_string_lossy().to_uppercase()))
            .unwrap_or_else(|| "File".to_string()),
    };

    Ok(FileMetadata {
        id: format!("inspect-{}", uuid::Uuid::new_v4()),
        name: file_name,
        path: expanded.clone(),
        size_bytes,
        kind: kind.to_string(),
        file_type_label,
        last_modified: modified,
        category,
        risk: RiskClassification::VerifiedSafe,
        associated_project: None,
        detection_reason: format!("Direct filesystem inspection: {}", kind),
        regeneration_instructions: None,
        recovery_command: None,
        cleanup_impact: "Individual item inspection".to_string(),
        item_count: if is_dir { Some(0) } else { None },
        is_hidden: Some(p.file_name().map(|n| n.to_string_lossy().starts_with('.')).unwrap_or(false)),
        is_symlink: Some(is_symlink),
    })
}
