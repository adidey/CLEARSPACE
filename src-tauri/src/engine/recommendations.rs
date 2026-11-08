use crate::models::artifact::{ArtifactEcosystem, DeveloperArtifact, Regenerability};
use crate::models::cleanup::CleanupRecommendation;
use crate::models::file::{RiskClassification, StorageCategory};
use chrono::{DateTime, Utc};

pub struct RecommendationEngine;

impl RecommendationEngine {
    pub fn generate_recommendations(
        artifacts: &[DeveloperArtifact],
    ) -> Vec<CleanupRecommendation> {
        let mut recommendations = Vec::new();
        let now = Utc::now();

        for (idx, art) in artifacts.iter().enumerate() {
            // Do not recommend cleaning persistent volumes or high-risk databases
            if art.risk == RiskClassification::HighRisk {
                continue;
            }

            let days_ago = calculate_days_ago(&art.last_modified, now);

            let title = match (&art.ecosystem, art.name.as_str()) {
                (ArtifactEcosystem::NodeJS, "node_modules") => {
                    if let Some(ref proj) = art.associated_project {
                        format!("Clean NPM Dependencies ({})", proj)
                    } else {
                        "Clean Unused node_modules".to_string()
                    }
                }
                (ArtifactEcosystem::Python, ".venv") | (ArtifactEcosystem::Python, "venv") => {
                    if let Some(ref proj) = art.associated_project {
                        format!("Prune Virtual Environment ({})", proj)
                    } else {
                        "Clean Python Virtual Environment".to_string()
                    }
                }
                (ArtifactEcosystem::AppleDev, "DerivedData") => "Clear Xcode DerivedData Cache".to_string(),
                (ArtifactEcosystem::AppleDev, "iOS Simulators") => "Delete Unused iOS Simulator Sandboxes".to_string(),
                (ArtifactEcosystem::Docker, _) => format!("Prune {}", art.name),
                (ArtifactEcosystem::Other, "target") => {
                    if let Some(ref proj) = art.associated_project {
                        format!("Clean Rust Build Cache ({})", proj)
                    } else {
                        "Clean Rust Target Build Output".to_string()
                    }
                }
                _ => format!("Clean {}", art.name),
            };

            let can_regen = art.regenerability == Regenerability::FullyRegenerable
                || art.regenerability == Regenerability::RebuildRequired;

            let regen_label = match art.regenerability {
                Regenerability::FullyRegenerable => "Fully regenerable via package manager",
                Regenerability::RebuildRequired => "Requires rebuild or network download",
                Regenerability::Conditional => "Conditional — verify uncommitted changes first",
                Regenerability::NonRegenerable => "Not automatically regenerable",
            };

            recommendations.push(CleanupRecommendation {
                id: format!("rec-{}", uuid::Uuid::new_v4()),
                item_id: art.item_id.clone(),
                title,
                artifact_name: art.name.clone(),
                path: art.path.clone(),
                size_bytes: art.size_bytes,
                category: StorageCategory::DeveloperFiles,
                ecosystem: Some(art.ecosystem.clone()),
                risk: art.risk.clone(),
                priority_rank: (idx + 1) as u32,
                what_it_is: art.artifact_type.clone(),
                why_identified: art.detection_reason.clone(),
                detected_markers: art.detected_evidence.clone(),
                can_regenerate: can_regen,
                regenerability_label: regen_label.to_string(),
                deletion_consequence: art.cleanup_impact.clone(),
                active_dependencies_detected: art.risk == RiskClassification::ReviewRequired,
                active_dependency_note: art.active_dependencies.clone(),
                restoration_steps: art.regeneration_instructions.clone(),
                recovery_command: art.recovery_command.clone(),
                last_accessed_days_ago: days_ago,
            });
        }

        // Sort recommendations: VerifiedSafe first, then by size descending
        recommendations.sort_by(|a, b| {
            let risk_rank = |r: &RiskClassification| match r {
                RiskClassification::VerifiedSafe => 0,
                RiskClassification::LowRisk => 1,
                RiskClassification::ReviewRequired => 2,
                RiskClassification::HighRisk => 3,
            };
            risk_rank(&a.risk)
                .cmp(&risk_rank(&b.risk))
                .then_with(|| b.size_bytes.cmp(&a.size_bytes))
        });

        // Re-assign 1-based priority rank after sorting
        for (i, rec) in recommendations.iter_mut().enumerate() {
            rec.priority_rank = (i + 1) as u32;
        }

        recommendations
    }
}

fn calculate_days_ago(iso_date: &str, now: DateTime<Utc>) -> u32 {
    if let Ok(dt) = DateTime::parse_from_rfc3339(iso_date) {
        let diff = now.signed_duration_since(dt.with_timezone(&Utc));
        diff.num_days().max(0) as u32
    } else {
        0
    }
}

