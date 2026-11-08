use std::path::{Path, PathBuf};

pub struct SafetyValidator;

impl SafetyValidator {
    /// Validates whether a target path is safe to move to Trash.
    /// Returns Ok(canonical_path) if valid, or Err(reason) if unsafe.
    pub fn validate_cleanup_target(raw_path: &str) -> Result<PathBuf, String> {
        let trimmed = raw_path.trim();
        if trimmed.is_empty() {
            return Err("Target path cannot be empty.".to_string());
        }

        // Docker internal URIs must not be deleted via filesystem
        if trimmed.starts_with("docker://") || trimmed.contains("/Containers/com.docker.docker") {
            return Err("Docker internal storage cannot be cleaned directly from filesystem. Use Docker CLI prune commands instead.".to_string());
        }

        let expanded = crate::engine::traversal::expand_tilde(trimmed);
        let path = Path::new(&expanded);

        // Path must exist right now
        if !path.exists() {
            return Err(format!("Path does not exist: {}", expanded));
        }

        // Check symlinks: do not delete through symlinks
        if let Ok(meta) = std::fs::symlink_metadata(path) {
            if meta.file_type().is_symlink() {
                return Err(format!("Target {} is a symbolic link. Clearspace refuses to clean symlinks directly for safety.", expanded));
            }
        }

        // Canonicalize to resolve any ../ path traversals
        let canonical = match path.canonicalize() {
            Ok(c) => c,
            Err(e) => return Err(format!("Cannot resolve canonical path for {}: {}", expanded, e)),
        };

        let canon_str = canonical.to_string_lossy();

        // Critical system directories that must NEVER be touched
        let forbidden_exact = [
            "/",
            "/System",
            "/System/Library",
            "/usr",
            "/usr/bin",
            "/usr/sbin",
            "/usr/lib",
            "/bin",
            "/sbin",
            "/private",
            "/private/var",
            "/private/etc",
            "/etc",
            "/var",
            "/Library",
            "/Applications",
            "/Volumes",
            "/Users",
        ];

        for &forbidden in &forbidden_exact {
            if canon_str == forbidden {
                return Err(format!("Path {} is a critical macOS system directory and cannot be modified.", canon_str));
            }
        }

        // Protect user home directory root (e.g. /Users/alice)
        if let Ok(home) = std::env::var("HOME") {
            if let Ok(home_canon) = Path::new(&home).canonicalize() {
                if canonical == home_canon {
                    return Err(format!("Path {} is your user home directory root and cannot be removed.", canon_str));
                }

                // Protect top-level user directories
                let protected_user_subdirs = [
                    "Desktop",
                    "Documents",
                    "Downloads",
                    "Library",
                    "Applications",
                    "Pictures",
                    "Music",
                    "Movies",
                    ".ssh",
                    ".gnupg",
                ];

                for subdir in &protected_user_subdirs {
                    let full_sub = home_canon.join(subdir);
                    if let Ok(canon_sub) = full_sub.canonicalize() {
                        if canonical == canon_sub {
                            return Err(format!("Path {} is a primary user workspace folder and cannot be removed.", canon_str));
                        }
                    }
                }

                // Strict ~/Library protection: ONLY explicitly verified developer toolchain caches are permitted
                let lib_path = home_canon.join("Library");
                if canonical.starts_with(&lib_path) {
                    let allowed_relative_prefixes = [
                        "Developer/Xcode/DerivedData",
                        "Developer/Xcode/Archives",
                        "Developer/CoreSimulator/Devices",
                        "Caches/pip",
                        "Caches/pypoetry",
                        "Caches/go-build",
                        "Caches/Yarn",
                        "Caches/Homebrew",
                        "pnpm/store",
                    ];

                    let is_allowed_developer_cache = allowed_relative_prefixes.iter().any(|rel| {
                        let full = lib_path.join(rel);
                        if let Ok(c) = full.canonicalize() {
                            canonical.starts_with(&c) || canonical == c
                        } else {
                            canonical.starts_with(&full) || canonical == full
                        }
                    });

                    if !is_allowed_developer_cache {
                        return Err(format!(
                            "Path {} is inside ~/Library. CLEARSPACE strictly protects user application data, preferences, and personal files in ~/Library unless located in an approved developer toolchain cache.",
                            canon_str
                        ));
                    }
                }
            }
        }

        // Protect mounted volume roots (e.g. /Volumes/ExternalDrive)
        if canon_str.starts_with("/Volumes/") {
            let parts: Vec<&str> = canon_str.trim_start_matches("/Volumes/").split('/').filter(|s| !s.is_empty()).collect();
            if parts.len() <= 1 {
                return Err(format!("Path {} is a root volume mount point and cannot be removed.", canon_str));
            }
        }

        // Verify path is deep enough (at least 3 components, e.g. /Users/alice/something)
        let components: Vec<_> = canonical.components().collect();
        if components.len() < 3 {
            return Err(format!("Path {} is too close to system root.", canon_str));
        }

        Ok(canonical)
    }
}
