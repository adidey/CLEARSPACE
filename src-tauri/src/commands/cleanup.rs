use crate::engine::safety::SafetyValidator;
use crate::models::cleanup::{CleanupExecutionRequest, CleanupExecutionResponse, CleanupResultItem};
use crate::persistence::database::DatabaseManager;
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::State;

/// Moves a validated filesystem item to macOS Trash using Finder AppleScript
pub fn move_single_item_to_trash(path: &Path) -> Result<(), String> {
    // Immediate TOCTOU guard: re-verify target metadata right before invocation
    let sym_meta = fs::symlink_metadata(path)
        .map_err(|e| format!("Target path cannot be accessed prior to trash operation: {}", e))?;
    if sym_meta.file_type().is_symlink() {
        return Err(format!("TOCTOU Guard: Target {} changed into a symbolic link. Aborting cleanup.", path.display()));
    }

    let output = Command::new("osascript")
        .arg("-e")
        .arg("on run argv")
        .arg("-e")
        .arg("tell application \"Finder\" to delete POSIX file (item 1 of argv)")
        .arg("-e")
        .arg("end run")
        .arg(path.as_os_str())
        .output()
        .map_err(|e| format!("Failed to invoke macOS Trash via osascript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!("Finder could not move item to Trash: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn move_item_to_trash(
    db: State<'_, DatabaseManager>,
    target_path: String,
) -> Result<CleanupResultItem, String> {
    let canonical = match SafetyValidator::validate_cleanup_target(&target_path) {
        Ok(c) => c,
        Err(reason) => {
            let _ = db.log_cleanup(&target_path, 0, false, Some(&reason));
            return Ok(CleanupResultItem {
                path: target_path,
                size_bytes: 0,
                success: false,
                error_message: Some(reason),
            });
        }
    };

    let size_bytes = calculate_item_size(&canonical);

    match move_single_item_to_trash(&canonical) {
        Ok(_) => {
            log::info!("Moved to macOS Trash: {:?}", canonical);
            let _ = db.log_cleanup(&target_path, size_bytes, true, None);
            Ok(CleanupResultItem {
                path: target_path,
                size_bytes,
                success: true,
                error_message: None,
            })
        }
        Err(e) => {
            log::warn!("Failed moving to Trash: {:?}", e);
            let _ = db.log_cleanup(&target_path, 0, false, Some(&e));
            Ok(CleanupResultItem {
                path: target_path,
                size_bytes: 0,
                success: false,
                error_message: Some(e),
            })
        }
    }
}

#[tauri::command]
pub fn execute_cleanup_batch(
    db: State<'_, DatabaseManager>,
    request: CleanupExecutionRequest,
) -> Result<CleanupExecutionResponse, String> {
    let mut results = Vec::new();
    let mut total_reclaimed: u64 = 0;
    let mut total_succeeded: usize = 0;

    for target in &request.target_paths {
        let canonical = match SafetyValidator::validate_cleanup_target(target) {
            Ok(c) => c,
            Err(reason) => {
                let _ = db.log_cleanup(target, 0, false, Some(&reason));
                results.push(CleanupResultItem {
                    path: target.clone(),
                    size_bytes: 0,
                    success: false,
                    error_message: Some(reason),
                });
                continue;
            }
        };

        let size_bytes = calculate_item_size(&canonical);

        match move_single_item_to_trash(&canonical) {
            Ok(_) => {
                log::info!("Successfully moved to Trash: {:?}", canonical);
                total_reclaimed += size_bytes;
                total_succeeded += 1;
                let _ = db.log_cleanup(target, size_bytes, true, None);
                results.push(CleanupResultItem {
                    path: target.clone(),
                    size_bytes,
                    success: true,
                    error_message: None,
                });
            }
            Err(err_msg) => {
                log::error!("Error moving {:?} to Trash: {}", canonical, err_msg);
                let _ = db.log_cleanup(target, 0, false, Some(&err_msg));
                results.push(CleanupResultItem {
                    path: target.clone(),
                    size_bytes: 0,
                    success: false,
                    error_message: Some(err_msg),
                });
            }
        }
    }

    Ok(CleanupExecutionResponse {
        total_requested: request.target_paths.len(),
        total_succeeded,
        total_bytes_reclaimed: total_reclaimed,
        results,
    })
}

fn calculate_item_size(path: &Path) -> u64 {
    if let Ok(meta) = fs::symlink_metadata(path) {
        if meta.is_file() {
            return meta.len();
        }
        if meta.is_dir() {
            let mut total = 0;
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    total += calculate_item_size(&entry.path());
                }
            }
            return total;
        }
    }
    0
}
