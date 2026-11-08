use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum StorageCategory {
    #[serde(rename = "Developer Files")]
    DeveloperFiles,
    #[serde(rename = "Applications")]
    Applications,
    #[serde(rename = "System Data")]
    SystemData,
    #[serde(rename = "Documents")]
    Documents,
    #[serde(rename = "Media")]
    Media,
    #[serde(rename = "Other")]
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskClassification {
    #[serde(rename = "VERIFIED_SAFE")]
    VerifiedSafe,
    #[serde(rename = "LOW_RISK")]
    LowRisk,
    #[serde(rename = "REVIEW_REQUIRED")]
    ReviewRequired,
    #[serde(rename = "HIGH_RISK")]
    HighRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub kind: String, // 'directory' | 'file' | 'archive' | 'disk-image' | 'cache' | 'bundle'
    pub file_type_label: String,
    pub last_modified: String, // ISO 8601
    pub category: StorageCategory,
    pub risk: RiskClassification,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub associated_project: Option<String>,
    pub detection_reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regeneration_instructions: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_command: Option<String>,
    pub cleanup_impact: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_hidden: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_symlink: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageItem {
    #[serde(flatten)]
    pub metadata: FileMetadata,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<StorageItem>>,
}

