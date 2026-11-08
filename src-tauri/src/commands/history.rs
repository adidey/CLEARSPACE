use crate::models::scan::ScanResult;
use crate::persistence::database::DatabaseManager;
use tauri::State;

#[tauri::command]
pub fn load_latest_scan_sqlite(
    db: State<'_, DatabaseManager>,
    _snapshot_id: Option<String>,
) -> Result<Option<ScanResult>, String> {
    db.get_latest_scan()
}

#[tauri::command]
pub fn list_scan_history_sqlite(
    db: State<'_, DatabaseManager>,
) -> Result<Vec<ScanResult>, String> {
    db.list_scans()
}

#[tauri::command]
pub fn clear_scan_history_sqlite(
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    db.clear_history()
}

#[tauri::command]
pub fn save_app_settings(
    db: State<'_, DatabaseManager>,
    settings_json: String,
) -> Result<(), String> {
    db.save_setting("app_settings_v1", &settings_json)
}

#[tauri::command]
pub fn load_app_settings(
    db: State<'_, DatabaseManager>,
) -> Result<Option<String>, String> {
    db.get_setting("app_settings_v1")
}

