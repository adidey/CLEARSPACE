use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ScanStatus {
    #[serde(rename = "IDLE")]
    Idle,
    #[serde(rename = "SCANNING")]
    Scanning,
    #[serde(rename = "COMPLETED")]
    Completed,
    #[serde(rename = "PERMISSION_DENIED")]
    PermissionDenied,
    #[serde(rename = "FAILED")]
    Failed,
    #[serde(rename = "EMPTY")]
    Empty,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorySummary {
    pub category: super::file::StorageCategory,
    pub size_bytes: u64,
    pub percentage_of_used: f64,
    pub percentage_of_total: f64,
    pub item_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub status: ScanStatus,
    pub percent_complete: u32,
    pub current_directory: String,
    pub files_scanned: u64,
    pub bytes_analysed: u64,
    pub elapsed_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub restricted_paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanOptions {
    pub target_path: String,
    pub excluded_folders: Vec<String>,
    pub include_hidden_files: bool,
    pub max_depth: Option<usize>,
    pub symlink_handling: String, // "ignore" | "follow-local"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub id: String,
    pub is_mock_data: bool,
    pub data_source_label: String,
    pub volume_name: String,
    pub volume_format: String,
    pub mount_point: String,
    pub scanned_at: String, // ISO timestamp
    pub scan_duration_seconds: f64,
    pub total_capacity_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub recoverable_bytes: u64,
    pub largest_directory_path: String,
    pub largest_directory_bytes: u64,
    pub categories: Vec<CategorySummary>,
    pub root_item: super::file::StorageItem,
    pub top_consumers: Vec<super::file::StorageItem>,
    pub artifacts: Vec<super::artifact::DeveloperArtifact>,
    pub recommendations: Vec<super::cleanup::CleanupRecommendation>,
}

