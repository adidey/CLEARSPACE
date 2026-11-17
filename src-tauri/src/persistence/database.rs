use crate::engine::traversal::expand_tilde;
use crate::models::scan::ScanResult;
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl Default for DatabaseManager {
    fn default() -> Self {
        let app_support = expand_tilde("~/Library/Application Support/com.clearspace.desktop");
        let dir = PathBuf::from(&app_support);
        let _ = fs::create_dir_all(&dir);
        let db_path = dir.join("clearspace.db");
        Self::open(db_path).expect("Failed to open CLEARSPACE database")
    }
}

impl DatabaseManager {
    pub fn open(db_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open SQLite database at {:?}: {}", db_path, e))?;

        // macOS-optimised PRAGMA settings
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA cache_size = -8000;
             PRAGMA mmap_size = 134217728;",
        )
        .map_err(|e| format!("Failed to set SQLite PRAGMAs: {}", e))?;

        let manager = Self {
            conn: Mutex::new(conn),
        };
        manager.init_tables()?;
        Ok(manager)
    }

    /// Only used in tests — allows injecting an arbitrary path.
    pub fn new(db_path: PathBuf) -> Self {
        Self::open(db_path).expect("Failed to open test database")
    }

    pub fn init_tables(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS scans (
                id                      TEXT PRIMARY KEY,
                scanned_at              TEXT NOT NULL,
                mount_point             TEXT NOT NULL,
                volume_name             TEXT NOT NULL,
                volume_format           TEXT NOT NULL,
                scan_duration_seconds   REAL NOT NULL,
                total_capacity_bytes    INTEGER NOT NULL,
                used_bytes              INTEGER NOT NULL,
                available_bytes         INTEGER NOT NULL,
                recoverable_bytes       INTEGER NOT NULL,
                data_json               TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cleanup_log (
                id              TEXT PRIMARY KEY,
                cleaned_at      TEXT NOT NULL,
                path            TEXT NOT NULL,
                size_bytes      INTEGER NOT NULL,
                success         INTEGER NOT NULL,
                error_message   TEXT
            );
            CREATE TABLE IF NOT EXISTS settings (
                key         TEXT PRIMARY KEY,
                value_json  TEXT NOT NULL
            );
            PRAGMA user_version = 1;",
        )
        .map_err(|e| format!("Failed to create tables: {}", e))?;
        Ok(())
    }

    pub fn save_scan(&self, scan: &ScanResult) -> Result<(), String> {
        let json_str = serde_json::to_string(scan)
            .map_err(|e| format!("Failed to serialise scan: {}", e))?;

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO scans (
                id, scanned_at, mount_point, volume_name, volume_format,
                scan_duration_seconds, total_capacity_bytes, used_bytes,
                available_bytes, recoverable_bytes, data_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                scan.id,
                scan.scanned_at,
                scan.mount_point,
                scan.volume_name,
                scan.volume_format,
                scan.scan_duration_seconds,
                scan.total_capacity_bytes as i64,
                scan.used_bytes as i64,
                scan.available_bytes as i64,
                scan.recoverable_bytes as i64,
                json_str,
            ],
        )
        .map_err(|e| format!("Failed to save scan: {}", e))?;
        Ok(())
    }

    pub fn list_scans(&self) -> Result<Vec<ScanResult>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT data_json FROM scans ORDER BY scanned_at DESC LIMIT 20")
            .map_err(|e| format!("Failed to prepare list_scans: {}", e))?;

        let scans: Vec<ScanResult> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed to query scans: {}", e))?
            .filter_map(|r| r.ok())
            .filter_map(|json| serde_json::from_str::<ScanResult>(&json).ok())
            .collect();

        Ok(scans)
    }

    pub fn get_latest_scan(&self) -> Result<Option<ScanResult>, String> {
        let scans = self.list_scans()?;
        Ok(scans.into_iter().next())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("DELETE FROM scans; DELETE FROM cleanup_log;")
            .map_err(|e| format!("Failed to clear history: {}", e))?;
        Ok(())
    }

    pub fn log_cleanup(
        &self,
        path: &str,
        size_bytes: u64,
        success: bool,
        error_message: Option<&str>,
    ) -> Result<(), String> {
        let id = format!("clean-{}", uuid::Uuid::new_v4());
        let now = chrono::Utc::now().to_rfc3339();

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO cleanup_log (id, cleaned_at, path, size_bytes, success, error_message)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id,
                now,
                path,
                size_bytes as i64,
                if success { 1i64 } else { 0i64 },
                error_message,
            ],
        )
        .map_err(|e| format!("Failed to log cleanup: {}", e))?;
        Ok(())
    }

    pub fn save_setting(&self, key: &str, value_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value_json) VALUES (?1, ?2)",
            params![key, value_json],
        )
        .map_err(|e| format!("Failed to save setting '{}': {}", key, e))?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value_json FROM settings WHERE key = ?1 LIMIT 1",
            params![key],
            |row| row.get::<_, String>(0),
        );

        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Failed to get setting '{}': {}", key, e)),
        }
    }
}
