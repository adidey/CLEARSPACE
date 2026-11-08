use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ArtifactEcosystem {
    #[serde(rename = "NODE_JS")]
    NodeJS,
    #[serde(rename = "PYTHON")]
    Python,
    #[serde(rename = "APPLE_DEV")]
    AppleDev,
    #[serde(rename = "DOCKER")]
    Docker,
    #[serde(rename = "OTHER")]
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Regenerability {
    #[serde(rename = "Fully regenerable")]
    FullyRegenerable,
    #[serde(rename = "Requires rebuild or download")]
    RebuildRequired,
    #[serde(rename = "Conditional — check local state")]
    Conditional,
    #[serde(rename = "Not automatically regenerable")]
    NonRegenerable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperArtifact {
    pub id: String,
    pub item_id: String,
    pub name: String,
    pub artifact_type: String,
    pub ecosystem: ArtifactEcosystem,
    pub size_bytes: u64,
    pub path: String,
    pub last_modified: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub associated_project: Option<String>,
    pub regenerability: Regenerability,
    pub risk: super::file::RiskClassification,
    pub detected_evidence: Vec<String>,
    pub detection_reason: String,
    pub cleanup_impact: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_command: Option<String>,
    pub regeneration_instructions: String,
    pub active_dependencies: String,
}

