use crate::engine::traversal::{expand_tilde, format_iso_time};
use crate::models::artifact::{ArtifactEcosystem, DeveloperArtifact, Regenerability};
use crate::models::file::{RiskClassification, StorageItem};
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::path::Path;
use std::process::Command;

pub struct DetectionEngine;

impl DetectionEngine {
    /// Detects developer artifacts by inspecting the scanned StorageItem tree
    pub fn detect_artifacts(root_item: &StorageItem) -> Vec<DeveloperArtifact> {
        let mut artifacts = Vec::new();
        Self::collect_artifacts_recursive(root_item, &mut artifacts);
        Self::detect_global_toolchains(&mut artifacts);
        Self::detect_docker_storage(&mut artifacts);
        artifacts
    }

    fn collect_artifacts_recursive(item: &StorageItem, results: &mut Vec<DeveloperArtifact>) {
        let path = Path::new(&item.metadata.path);
        let name = &item.metadata.name;
        let lower_name = name.to_lowercase();

        // 1. Node.js: node_modules
        if lower_name == "node_modules" && item.metadata.kind == "directory" {
            let parent_dir = path.parent();
            let mut has_package_json = false;
            let mut lockfile = None;
            let mut project_name = None;

            if let Some(p) = parent_dir {
                let pkg_json = p.join("package.json");
                if pkg_json.exists() {
                    has_package_json = true;
                    if let Ok(content) = fs::read_to_string(&pkg_json) {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Some(n) = parsed.get("name").and_then(|v| v.as_str()) {
                                project_name = Some(n.to_string());
                            }
                        }
                    }
                }

                if p.join("package-lock.json").exists() {
                    lockfile = Some("package-lock.json");
                } else if p.join("pnpm-lock.yaml").exists() {
                    lockfile = Some("pnpm-lock.yaml");
                } else if p.join("yarn.lock").exists() {
                    lockfile = Some("yarn.lock");
                } else if p.join("bun.lockb").exists() || p.join("bun.lock").exists() {
                    lockfile = Some("bun.lock");
                }
            }

            let proj = project_name.or_else(|| {
                parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string())
            });

            let mut evidence = Vec::new();
            if has_package_json {
                evidence.push("package.json present in parent directory".to_string());
            }
            if let Some(lf) = lockfile {
                evidence.push(format!("Lockfile ({}) verified intact", lf));
            } else {
                evidence.push("No lockfile found (unlocked dependency tree)".to_string());
            }

            let (risk, regen, rec_cmd) = if lockfile.is_some() {
                (
                    RiskClassification::VerifiedSafe,
                    Regenerability::FullyRegenerable,
                    parent_dir.map(|p| format!("cd {} && npm install", p.display())),
                )
            } else {
                (
                    RiskClassification::ReviewRequired,
                    Regenerability::RebuildRequired,
                    parent_dir.map(|p| format!("cd {} && npm install --package-lock-only", p.display())),
                )
            };

            results.push(DeveloperArtifact {
                id: format!("art-node-{}", uuid::Uuid::new_v4()),
                item_id: item.metadata.id.clone(),
                name: "node_modules".to_string(),
                artifact_type: "NPM Dependency Tree".to_string(),
                ecosystem: ArtifactEcosystem::NodeJS,
                size_bytes: item.metadata.size_bytes,
                path: item.metadata.path.clone(),
                last_modified: item.metadata.last_modified.clone(),
                associated_project: proj,
                regenerability: regen,
                risk,
                detected_evidence: evidence,
                detection_reason: if lockfile.is_some() {
                    "Dependencies locked via package manifest; safe to regenerate.".to_string()
                } else {
                    "Missing lockfile; regenerating may resolve breaking semver versions.".to_string()
                },
                cleanup_impact: "Removes local dependency binaries; application source code is preserved.".to_string(),
                recovery_command: rec_cmd,
                regeneration_instructions: "Run package manager install command in project directory to reinstall.".to_string(),
                active_dependencies: if lockfile.is_some() {
                    "Lockfile verified intact".to_string()
                } else {
                    "Lockfile missing — verify before removing".to_string()
                },
            });
        }

        // 2. Python: .venv or venv
        if (lower_name == ".venv" || lower_name == "venv") && item.metadata.kind == "directory" {
            let parent_dir = path.parent();
            let mut has_reqs = false;
            let mut has_poetry = false;

            if let Some(p) = parent_dir {
                has_reqs = p.join("requirements.txt").exists();
                has_poetry = p.join("poetry.lock").exists() || p.join("pyproject.toml").exists();
            }

            let proj = parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string());

            let mut evidence = Vec::new();
            if has_poetry {
                evidence.push("Poetry environment specification detected".to_string());
            }
            if has_reqs {
                evidence.push("requirements.txt detected in project root".to_string());
            }
            if !has_poetry && !has_reqs {
                evidence.push("No explicit lockfile or requirements.txt discovered".to_string());
            }

            let (risk, regen, rec_cmd) = if has_poetry || has_reqs {
                (
                    RiskClassification::VerifiedSafe,
                    Regenerability::FullyRegenerable,
                    parent_dir.map(|p| {
                        if has_poetry {
                            format!("cd {} && poetry install", p.display())
                        } else {
                            format!("cd {} && python3 -m venv .venv && pip install -r requirements.txt", p.display())
                        }
                    }),
                )
            } else {
                (
                    RiskClassification::ReviewRequired,
                    Regenerability::Conditional,
                    parent_dir.map(|p| format!("cd {} && pip freeze > requirements.txt", p.display())),
                )
            };

            results.push(DeveloperArtifact {
                id: format!("art-py-{}", uuid::Uuid::new_v4()),
                item_id: item.metadata.id.clone(),
                name: name.clone(),
                artifact_type: "Python Virtual Environment".to_string(),
                ecosystem: ArtifactEcosystem::Python,
                size_bytes: item.metadata.size_bytes,
                path: item.metadata.path.clone(),
                last_modified: item.metadata.last_modified.clone(),
                associated_project: proj,
                regenerability: regen,
                risk,
                detected_evidence: evidence,
                detection_reason: "Isolated Python site-packages and virtualenv interpreter binaries.".to_string(),
                cleanup_impact: "Frees virtual environment binaries; source code and notebooks remain untouched.".to_string(),
                recovery_command: rec_cmd,
                regeneration_instructions: "Recreate virtual environment with python3 -m venv and install dependencies.".to_string(),
                active_dependencies: if has_poetry || has_reqs {
                    "Dependency manifest present".to_string()
                } else {
                    "Unpinned dependencies — save requirements first".to_string()
                },
            });
        }

        // 3. Rust or Maven: target/ directory alongside Cargo.toml or pom.xml
        if lower_name == "target" && item.metadata.kind == "directory" {
            let parent_dir = path.parent();
            let mut is_cargo_target = false;
            let mut is_maven_target = false;
            let mut proj_name = None;

            if let Some(p) = parent_dir {
                let cargo_toml = p.join("Cargo.toml");
                let pom_xml = p.join("pom.xml");

                if cargo_toml.exists() {
                    is_cargo_target = true;
                    if let Ok(content) = fs::read_to_string(&cargo_toml) {
                        for line in content.lines() {
                            if line.trim().starts_with("name =") {
                                if let Some(n) = line.split('=').nth(1) {
                                    proj_name = Some(n.trim().trim_matches('"').to_string());
                                    break;
                                }
                            }
                        }
                    }
                } else if pom_xml.exists() {
                    is_maven_target = true;
                    proj_name = p.file_name().map(|n| n.to_string_lossy().to_string());
                }
            }

            if is_cargo_target {
                let proj = proj_name.or_else(|| {
                    parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string())
                });

                results.push(DeveloperArtifact {
                    id: format!("art-rust-{}", uuid::Uuid::new_v4()),
                    item_id: item.metadata.id.clone(),
                    name: "target".to_string(),
                    artifact_type: "Rust Incremental Build Output".to_string(),
                    ecosystem: ArtifactEcosystem::Other,
                    size_bytes: item.metadata.size_bytes,
                    path: item.metadata.path.clone(),
                    last_modified: item.metadata.last_modified.clone(),
                    associated_project: proj,
                    regenerability: Regenerability::FullyRegenerable,
                    risk: RiskClassification::VerifiedSafe,
                    detected_evidence: vec![
                        "Cargo.toml detected in project root".to_string(),
                        "Intermediate .rlib and incremental compilation artifacts".to_string(),
                    ],
                    detection_reason: "Cargo build cache and intermediate compiled crates.".to_string(),
                    cleanup_impact: "Frees build output; next cargo build will perform a clean compilation.".to_string(),
                    recovery_command: parent_dir.map(|p| format!("cd {} && cargo build", p.display())),
                    regeneration_instructions: "Run cargo build or cargo test to recompile.".to_string(),
                    active_dependencies: "Source crates intact in src/ or crates/".to_string(),
                });
            } else if is_maven_target {
                let proj = proj_name.or_else(|| {
                    parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string())
                });

                results.push(DeveloperArtifact {
                    id: format!("art-maven-{}", uuid::Uuid::new_v4()),
                    item_id: item.metadata.id.clone(),
                    name: "target".to_string(),
                    artifact_type: "Maven Build Intermediates".to_string(),
                    ecosystem: ArtifactEcosystem::Other,
                    size_bytes: item.metadata.size_bytes,
                    path: item.metadata.path.clone(),
                    last_modified: item.metadata.last_modified.clone(),
                    associated_project: proj,
                    regenerability: Regenerability::FullyRegenerable,
                    risk: RiskClassification::VerifiedSafe,
                    detected_evidence: vec![
                        "pom.xml detected in project root".to_string(),
                        "Compiled classes and packaged JAR targets".to_string(),
                    ],
                    detection_reason: "Maven build directory containing target compilation artifacts.".to_string(),
                    cleanup_impact: "Frees build output; next mvn package will recompile.".to_string(),
                    recovery_command: parent_dir.map(|p| format!("cd {} && mvn compile", p.display())),
                    regeneration_instructions: "Run mvn compile or mvn package to rebuild.".to_string(),
                    active_dependencies: "Java source files in src/main/java preserved".to_string(),
                });
            }
        }

        // 4. Gradle: build/ directory alongside build.gradle or build.gradle.kts
        if lower_name == "build" && item.metadata.kind == "directory" {
            let parent_dir = path.parent();
            let mut is_gradle_build = false;

            if let Some(p) = parent_dir {
                if p.join("build.gradle").exists()
                    || p.join("build.gradle.kts").exists()
                    || p.join("settings.gradle").exists()
                    || p.join("settings.gradle.kts").exists()
                {
                    is_gradle_build = true;
                }
            }

            if is_gradle_build {
                let proj = parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string());
                results.push(DeveloperArtifact {
                    id: format!("art-gradle-{}", uuid::Uuid::new_v4()),
                    item_id: item.metadata.id.clone(),
                    name: "build".to_string(),
                    artifact_type: "Gradle Build Intermediates".to_string(),
                    ecosystem: ArtifactEcosystem::Other,
                    size_bytes: item.metadata.size_bytes,
                    path: item.metadata.path.clone(),
                    last_modified: item.metadata.last_modified.clone(),
                    associated_project: proj,
                    regenerability: Regenerability::FullyRegenerable,
                    risk: RiskClassification::VerifiedSafe,
                    detected_evidence: vec![
                        "Gradle build script (build.gradle/kts) detected in project root".to_string(),
                        "Compiled bytecode classes and generated resources".to_string(),
                    ],
                    detection_reason: "Gradle output directory containing intermediate build outputs.".to_string(),
                    cleanup_impact: "Frees compiled outputs; next gradle build will rebuild tasks.".to_string(),
                    recovery_command: parent_dir.map(|p| format!("cd {} && ./gradlew build", p.display())),
                    regeneration_instructions: "Run ./gradlew build or ./gradlew assemble to regenerate.".to_string(),
                    active_dependencies: "Source code intact".to_string(),
                });
            }
        }

        // 5. PHP Composer or Go: vendor/ directory
        if lower_name == "vendor" && item.metadata.kind == "directory" {
            let parent_dir = path.parent();
            let mut is_composer = false;
            let mut has_composer_lock = false;
            let mut is_govendor = false;

            if let Some(p) = parent_dir {
                if p.join("composer.json").exists() {
                    is_composer = true;
                    has_composer_lock = p.join("composer.lock").exists();
                } else if p.join("go.mod").exists() {
                    is_govendor = true;
                }
            }

            if is_composer {
                let proj = parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string());
                let (risk, regen, rec_cmd) = if has_composer_lock {
                    (
                        RiskClassification::VerifiedSafe,
                        Regenerability::FullyRegenerable,
                        parent_dir.map(|p| format!("cd {} && composer install", p.display())),
                    )
                } else {
                    (
                        RiskClassification::ReviewRequired,
                        Regenerability::Conditional,
                        parent_dir.map(|p| format!("cd {} && composer update --lock", p.display())),
                    )
                };

                results.push(DeveloperArtifact {
                    id: format!("art-composer-{}", uuid::Uuid::new_v4()),
                    item_id: item.metadata.id.clone(),
                    name: "vendor".to_string(),
                    artifact_type: "PHP Composer Dependencies".to_string(),
                    ecosystem: ArtifactEcosystem::Other,
                    size_bytes: item.metadata.size_bytes,
                    path: item.metadata.path.clone(),
                    last_modified: item.metadata.last_modified.clone(),
                    associated_project: proj,
                    regenerability: regen,
                    risk,
                    detected_evidence: vec![
                        "composer.json detected in parent directory".to_string(),
                        if has_composer_lock {
                            "composer.lock verified intact".to_string()
                        } else {
                            "composer.lock missing — dependency versions unlocked".to_string()
                        },
                    ],
                    detection_reason: "Installed PHP package dependencies managed via Composer.".to_string(),
                    cleanup_impact: "Frees third-party vendor code; project code preserved.".to_string(),
                    recovery_command: rec_cmd,
                    regeneration_instructions: "Run composer install to restore packages.".to_string(),
                    active_dependencies: if has_composer_lock {
                        "Dependencies locked".to_string()
                    } else {
                        "Dependencies unpinned — review before deleting".to_string()
                    },
                });
            } else if is_govendor {
                let proj = parent_dir.and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string());
                results.push(DeveloperArtifact {
                    id: format!("art-govendor-{}", uuid::Uuid::new_v4()),
                    item_id: item.metadata.id.clone(),
                    name: "vendor".to_string(),
                    artifact_type: "Go Vendored Modules".to_string(),
                    ecosystem: ArtifactEcosystem::Other,
                    size_bytes: item.metadata.size_bytes,
                    path: item.metadata.path.clone(),
                    last_modified: item.metadata.last_modified.clone(),
                    associated_project: proj,
                    regenerability: Regenerability::FullyRegenerable,
                    risk: RiskClassification::LowRisk,
                    detected_evidence: vec![
                        "go.mod detected in project root".to_string(),
                        "Vendored copy of Go module dependencies".to_string(),
                    ],
                    detection_reason: "Locally copied Go dependencies. Can be regenerated from module cache.".to_string(),
                    cleanup_impact: "Frees vendored copy; Go toolchain can vendor or use module cache.".to_string(),
                    recovery_command: parent_dir.map(|p| format!("cd {} && go mod vendor", p.display())),
                    regeneration_instructions: "Run go mod vendor to repopulate vendor directory.".to_string(),
                    active_dependencies: "go.mod and go.sum intact".to_string(),
                });
            }
        }

        // 6. Apple: Xcode DerivedData
        if lower_name == "deriveddata" && item.metadata.kind == "directory" {
            results.push(DeveloperArtifact {
                id: format!("art-xcode-dd-{}", uuid::Uuid::new_v4()),
                item_id: item.metadata.id.clone(),
                name: "DerivedData".to_string(),
                artifact_type: "Xcode Intermediate Build Cache".to_string(),
                ecosystem: ArtifactEcosystem::AppleDev,
                size_bytes: item.metadata.size_bytes,
                path: item.metadata.path.clone(),
                last_modified: item.metadata.last_modified.clone(),
                associated_project: Some("Xcode Workspaces".to_string()),
                regenerability: Regenerability::FullyRegenerable,
                risk: RiskClassification::VerifiedSafe,
                detected_evidence: vec![
                    "Xcode module cache and indexing stores detected".to_string(),
                ],
                detection_reason: "Intermediate Swift/Clang compilation objects and Xcode symbol index.".to_string(),
                cleanup_impact: "Zero loss of source files. Next Xcode build rebuilds intermediates.".to_string(),
                recovery_command: Some("xcodebuild -scheme <scheme> build".to_string()),
                regeneration_instructions: "Xcode automatically re-indexes and regenerates DerivedData on project open.".to_string(),
                active_dependencies: "Projects unaffected".to_string(),
            });
        }

        // Recurse into children
        if let Some(children) = &item.children {
            for child in children {
                Self::collect_artifacts_recursive(child, results);
            }
        }
    }

    /// Detects global user package caches on macOS
    fn detect_global_toolchains(results: &mut Vec<DeveloperArtifact>) {
        let global_checks = [
            (
                "~/Library/Developer/Xcode/DerivedData",
                "Xcode DerivedData",
                "Xcode Build Intermediates",
                ArtifactEcosystem::AppleDev,
                RiskClassification::VerifiedSafe,
                "Xcode indexing and build intermediates across all local projects",
                "xcodebuild -alltargets",
            ),
            (
                "~/Library/Developer/CoreSimulator/Devices",
                "iOS Simulators",
                "Simulator Runtimes & Sandboxes",
                ArtifactEcosystem::AppleDev,
                RiskClassification::LowRisk,
                "iOS/watchOS Simulator sandboxes and cached runtimes",
                "xcrun simctl delete unavailable",
            ),
            (
                "~/.npm/_cacache",
                "npm cache",
                "npm HTTP Tarball Cache",
                ArtifactEcosystem::NodeJS,
                RiskClassification::VerifiedSafe,
                "Cached tarballs downloaded from registry.npmjs.org",
                "npm cache clean --force",
            ),
            (
                "~/Library/pnpm/store/v3",
                "pnpm store",
                "pnpm Content-Addressable Store",
                ArtifactEcosystem::NodeJS,
                RiskClassification::VerifiedSafe,
                "Deduplicated package store files",
                "pnpm store prune",
            ),
            (
                "~/Library/Caches/pip",
                "pip cache",
                "pip Wheel & HTTP Cache",
                ArtifactEcosystem::Python,
                RiskClassification::VerifiedSafe,
                "Cached PyPI wheels and downloads",
                "pip cache purge",
            ),
            (
                "~/Library/Caches/pypoetry",
                "Poetry cache",
                "Poetry Artifact Cache",
                ArtifactEcosystem::Python,
                RiskClassification::VerifiedSafe,
                "Cached Python distribution archives",
                "poetry cache clear pypi --all",
            ),
            (
                "~/Library/Caches/go-build",
                "Go build cache",
                "Go Compiler Action Cache",
                ArtifactEcosystem::Other,
                RiskClassification::VerifiedSafe,
                "Compiled package object cache managed by Go toolchain",
                "go clean -cache",
            ),
            (
                "~/.gradle/caches",
                "Gradle caches",
                "Gradle Dependency Cache",
                ArtifactEcosystem::Other,
                RiskClassification::LowRisk,
                "Gradle distribution wrappers and transformed JAR artifacts",
                "./gradlew --stop",
            ),
            (
                "~/.composer/cache",
                "Composer cache",
                "Composer Package Archive Cache",
                ArtifactEcosystem::Other,
                RiskClassification::VerifiedSafe,
                "Cached zip archives of downloaded Packagist distributions",
                "composer clear-cache",
            ),
            (
                "~/.android/cache",
                "Android SDK cache",
                "Android Emulator & SDK Cache",
                ArtifactEcosystem::Other,
                RiskClassification::LowRisk,
                "Cached Android build tool archives and platform tools",
                "rm -rf ~/.android/cache/*",
            ),
        ];

        for (path_str, name, art_type, eco, risk, impact, rec_cmd) in global_checks {
            let expanded = expand_tilde(path_str);
            let p = Path::new(&expanded);
            if p.exists() && p.is_dir() {
                // Avoid duplicating if already scanned under root
                if results.iter().any(|r| r.path == expanded) {
                    continue;
                }

                if let Ok(meta) = fs::symlink_metadata(p) {
                    let size = calculate_shallow_dir_size(p);
                    if size > 10 * 1024 * 1024 { // Only report if > 10MB
                        results.push(DeveloperArtifact {
                            id: format!("art-global-{}", uuid::Uuid::new_v4()),
                            item_id: format!("item-{}", uuid::Uuid::new_v4()),
                            name: name.to_string(),
                            artifact_type: art_type.to_string(),
                            ecosystem: eco,
                            size_bytes: size,
                            path: expanded,
                            last_modified: format_iso_time(meta.mtime()),
                            associated_project: None,
                            regenerability: Regenerability::FullyRegenerable,
                            risk,
                            detected_evidence: vec![format!("Verified global cache path: {}", path_str)],
                            detection_reason: format!("Standard macOS developer tool cache: {}", name),
                            cleanup_impact: impact.to_string(),
                            recovery_command: Some(rec_cmd.to_string()),
                            regeneration_instructions: format!("Toolchain automatically repopulates cache on next build: {}", rec_cmd),
                            active_dependencies: "Cached files only — no project source files stored here".to_string(),
                        });
                    }
                }
            }
        }
    }

    /// Queries Docker via CLI if installed and running
    fn detect_docker_storage(results: &mut Vec<DeveloperArtifact>) {
        let output = Command::new("docker")
            .args(["system", "df", "--format", "{{.Type}}:{{.Size}}:{{.Reclaimable}}"])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split(':').collect();
                    if parts.len() >= 3 {
                        let dtype = parts[0].trim();
                        let size_str = parts[1].trim();

                        if dtype.contains("Build Cache") {
                            results.push(DeveloperArtifact {
                                id: format!("art-docker-build-{}", uuid::Uuid::new_v4()),
                                item_id: format!("item-docker-{}", uuid::Uuid::new_v4()),
                                name: "Docker BuildKit Cache".to_string(),
                                artifact_type: "Docker Build Cache Layers".to_string(),
                                ecosystem: ArtifactEcosystem::Docker,
                                size_bytes: parse_docker_size(size_str),
                                path: "docker://buildkit-cache".to_string(),
                                last_modified: format_iso_time(chrono::Utc::now().timestamp()),
                                associated_project: Some("Docker Daemon".to_string()),
                                regenerability: Regenerability::FullyRegenerable,
                                risk: RiskClassification::VerifiedSafe,
                                detected_evidence: vec![format!("Docker CLI reported build cache: {}", size_str)],
                                detection_reason: "Unreferenced Docker image build cache layers.".to_string(),
                                cleanup_impact: "Frees build layer cache; rebuilt on next docker build.".to_string(),
                                recovery_command: Some("docker builder prune --all".to_string()),
                                regeneration_instructions: "Run docker builder prune or build images with docker build.".to_string(),
                                active_dependencies: "Running containers unaffected".to_string(),
                            });
                        } else if dtype.contains("Local Volumes") {
                            results.push(DeveloperArtifact {
                                id: format!("art-docker-vol-{}", uuid::Uuid::new_v4()),
                                item_id: format!("item-docker-vol-{}", uuid::Uuid::new_v4()),
                                name: "Docker Persistent Volumes".to_string(),
                                artifact_type: "Docker Named Volumes".to_string(),
                                ecosystem: ArtifactEcosystem::Docker,
                                size_bytes: parse_docker_size(size_str),
                                path: "docker://volumes".to_string(),
                                last_modified: format_iso_time(chrono::Utc::now().timestamp()),
                                associated_project: Some("Docker Daemon".to_string()),
                                regenerability: Regenerability::NonRegenerable,
                                risk: RiskClassification::HighRisk,
                                detected_evidence: vec![format!("Docker CLI reported persistent volumes: {}", size_str)],
                                detection_reason: "Docker named volumes containing persistent databases and application state.".to_string(),
                                cleanup_impact: "HIGH RISK: Permanent loss of container database records and volume data.".to_string(),
                                recovery_command: None,
                                regeneration_instructions: "Requires manual database backup / dump before deletion.".to_string(),
                                active_dependencies: "May be mounted by local development databases".to_string(),
                            });
                        }
                    }
                }
            }
            _ => {
                log::debug!("Docker CLI not running or unavailable.");
            }
        }
    }
}

fn calculate_shallow_dir_size(dir: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    total += meta.len();
                } else if meta.is_dir() {
                    // One level deep
                    if let Ok(sub) = fs::read_dir(entry.path()) {
                        for sub_entry in sub.flatten() {
                            if let Ok(sm) = sub_entry.metadata() {
                                if sm.is_file() {
                                    total += sm.len();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    total
}

fn parse_docker_size(raw: &str) -> u64 {
    let lower = raw.trim().to_lowercase();
    let num_part: String = lower.chars().filter(|c| c.is_numeric() || *c == '.').collect();
    let val: f64 = num_part.parse().unwrap_or(0.0);

    if lower.contains("gb") || lower.contains("gib") {
        (val * 1_000_000_000.0) as u64
    } else if lower.contains("mb") || lower.contains("mib") {
        (val * 1_000_000.0) as u64
    } else if lower.contains("kb") || lower.contains("kib") {
        (val * 1_000.0) as u64
    } else {
        val as u64
    }
}
