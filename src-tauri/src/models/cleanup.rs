use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupRecommendation {
    pub id: String,
    pub item_id: String,
    pub title: String,
    pub artifact_name: String,
    pub path: String,
    pub size_bytes: u64,
    pub category: super::file::StorageCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ecosystem: Option<super::artifact::ArtifactEcosystem>,
    pub risk: super::file::RiskClassification,
    pub priority_rank: u32,
    pub what_it_is: String,
    pub why_identified: String,
    pub detected_markers: Vec<String>,
    pub can_regenerate: bool,
    pub regenerability_label: String,
    pub deletion_consequence: String,
    pub active_dependencies_detected: bool,
    pub active_dependency_note: String,
    pub restoration_steps: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_command: Option<String>,
    pub last_accessed_days_ago: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupExecutionRequest {
    pub target_paths: Vec<String>,
    pub require_trash: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResultItem {
    pub path: String,
    pub size_bytes: u64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupExecutionResponse {
    pub total_requested: usize,
    pub total_succeeded: usize,
    pub total_bytes_reclaimed: u64,
    pub results: Vec<CleanupResultItem>,
}

