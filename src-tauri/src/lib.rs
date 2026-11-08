#![allow(clippy::collapsible_if)]

pub mod commands;
pub mod engine;
pub mod models;
pub mod persistence;

use commands::cleanup::{execute_cleanup_batch, move_item_to_trash};
use commands::history::{
    clear_scan_history_sqlite, list_scan_history_sqlite, load_app_settings,
    load_latest_scan_sqlite, save_app_settings,
};
use commands::scanner::{
    cancel_scan, inspect_filesystem_item, pick_scan_directory, scan_directory, ScannerState,
};
use commands::greet;
use persistence::database::DatabaseManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ScannerState::default())
        .manage(DatabaseManager::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            pick_scan_directory,
            scan_directory,
            cancel_scan,
            inspect_filesystem_item,
            move_item_to_trash,
            execute_cleanup_batch,
            load_latest_scan_sqlite,
            list_scan_history_sqlite,
            clear_scan_history_sqlite,
            save_app_settings,
            load_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Clearspace");
}
