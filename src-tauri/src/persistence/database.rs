use crate::engine::traversal::expand_tilde;
use crate::models::scan::ScanResult;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

pub struct DatabaseManager {
    db_path: PathBuf,
}

impl Default for DatabaseManager {
    fn default() -> Self {
        let app_support = expand_tilde("~/Library/Application Support/com.clearspace.desktop");
        let dir = PathBuf::from(app_support);
        let _ = fs::create_dir_all(&dir);
        let db_path = dir.join("clearspace.db");
        let manager = Self { db_path };
        let _ = manager.init_tables();
        manager
    }
}

impl DatabaseManager {
    pub fn new(db_path: PathBuf) -> Self {
        if let Some(parent) = db_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let manager = Self { db_path };
        let _ = manager.init_tables();
        manager
    }

    fn execute_sql(&self, sql: &str) -> Result<String, String> {
        let path_str = self.db_path.to_string_lossy().to_string();
        let mut child = Command::new("sqlite3")
            .arg(&path_str)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn sqlite3: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(sql.as_bytes())
                .map_err(|e| format!("Failed writing to sqlite3 stdin: {}", e))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed waiting for sqlite3: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("SQLite execution failed: {}", err));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    fn query_json(&self, sql: &str) -> Result<String, String> {
        let path_str = self.db_path.to_string_lossy().to_string();
        let mut child = Command::new("sqlite3")
            .arg("-json")
            .arg(&path_str)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn sqlite3 query: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(sql.as_bytes())
                .map_err(|e| format!("Failed writing to sqlite3 stdin: {}", e))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed waiting for sqlite3 query: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("SQLite query failed: {}", err));
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub fn init_tables(&self) -> Result<(), String> {
        let init_sql = r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            scanned_at TEXT NOT NULL,
            mount_point TEXT NOT NULL,
            volume_name TEXT NOT NULL,
            volume_format TEXT NOT NULL,
            scan_duration_seconds REAL NOT NULL,
            total_capacity_bytes INTEGER NOT NULL,
            used_bytes INTEGER NOT NULL,
            available_bytes INTEGER NOT NULL,
            recoverable_bytes INTEGER NOT NULL,
            data_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cleanup_log (
            id TEXT PRIMARY KEY,
            cleaned_at TEXT NOT NULL,
            path TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            success INTEGER NOT NULL,
            error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
        );

        PRAGMA user_version = 1;
        "#;
        self.execute_sql(init_sql)?;
        Ok(())
    }

    pub fn save_scan(&self, scan: &ScanResult) -> Result<(), String> {
        let json_str = serde_json::to_string(scan)
            .map_err(|e| format!("Failed to serialize scan: {}", e))?;

        // Escape single quotes for SQL insertion
        let escaped_json = json_str.replace('\'', "''");
        let escaped_vol = scan.volume_name.replace('\'', "''");
        let escaped_fmt = scan.volume_format.replace('\'', "''");
        let escaped_mount = scan.mount_point.replace('\'', "''");

        let sql = format!(
            r#"BEGIN TRANSACTION;
            INSERT OR REPLACE INTO scans (
                id, scanned_at, mount_point, volume_name, volume_format,
                scan_duration_seconds, total_capacity_bytes, used_bytes,
                available_bytes, recoverable_bytes, data_json
            ) VALUES (
                '{}', '{}', '{}', '{}', '{}', {}, {}, {}, {}, {}, '{}'
            );
            COMMIT;"#,
            scan.id,
            scan.scanned_at,
            escaped_mount,
            escaped_vol,
            escaped_fmt,
            scan.scan_duration_seconds,
            scan.total_capacity_bytes,
            scan.used_bytes,
            scan.available_bytes,
            scan.recoverable_bytes,
            escaped_json
        );

        self.execute_sql(&sql)?;
        Ok(())
    }

    pub fn list_scans(&self) -> Result<Vec<ScanResult>, String> {
        let query = "SELECT data_json FROM scans ORDER BY scanned_at DESC LIMIT 20;";
        let json_output = self.query_json(query)?;

        if json_output.is_empty() || json_output == "[]" {
            return Ok(Vec::new());
        }

        let rows: Vec<serde_json::Value> = serde_json::from_str(&json_output)
            .map_err(|e| format!("Failed to parse scans query result: {}", e))?;

        let mut scans = Vec::new();
        for row in rows {
            if let Some(data_str) = row.get("data_json").and_then(|v| v.as_str()) {
                if let Ok(scan) = serde_json::from_str::<ScanResult>(data_str) {
                    scans.push(scan);
                }
            }
        }

        Ok(scans)
    }

    pub fn get_latest_scan(&self) -> Result<Option<ScanResult>, String> {
        let scans = self.list_scans()?;
        Ok(scans.into_iter().next())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        self.execute_sql("DELETE FROM scans;")?;
        self.execute_sql("DELETE FROM cleanup_log;")?;
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
        let escaped_path = path.replace('\'', "''");
        let escaped_err = error_message
            .map(|e| format!("'{}'", e.replace('\'', "''")))
            .unwrap_or_else(|| "NULL".to_string());

        let sql = format!(
            "BEGIN TRANSACTION;\nINSERT INTO cleanup_log (id, cleaned_at, path, size_bytes, success, error_message) VALUES ('{}', '{}', '{}', {}, {}, {});\nCOMMIT;",
            id, now, escaped_path, size_bytes, if success { 1 } else { 0 }, escaped_err
        );

        self.execute_sql(&sql)?;
        Ok(())
    }

    pub fn save_setting(&self, key: &str, value_json: &str) -> Result<(), String> {
        let escaped_key = key.replace('\'', "''");
        let escaped_val = value_json.replace('\'', "''");
        let sql = format!(
            "BEGIN TRANSACTION;\nINSERT OR REPLACE INTO settings (key, value_json) VALUES ('{}', '{}');\nCOMMIT;",
            escaped_key, escaped_val
        );
        self.execute_sql(&sql)?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let escaped_key = key.replace('\'', "''");
        let query = format!(
            "SELECT value_json FROM settings WHERE key = '{}' LIMIT 1;",
            escaped_key
        );
        let json_output = self.query_json(&query)?;

        if json_output.is_empty() || json_output == "[]" {
            return Ok(None);
        }

        let rows: Vec<serde_json::Value> = serde_json::from_str(&json_output)
            .map_err(|e| format!("Failed to parse setting query: {}", e))?;

        if let Some(first) = rows.first() {
            if let Some(val) = first.get("value_json").and_then(|v| v.as_str()) {
                return Ok(Some(val.to_string()));
            }
        }

        Ok(None)
    }
}

