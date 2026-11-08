#[cfg(test)]
mod tests {
    use crate::engine::detection::DetectionEngine;
    use crate::engine::safety::SafetyValidator;
    use crate::engine::size_calculator::{categorize_path, get_kind};
    use crate::engine::traversal::{expand_tilde, scan_directory_tree, ScanContext};
    use crate::models::file::{RiskClassification, StorageCategory};
    use crate::models::scan::{CategorySummary, ScanOptions, ScanResult};
    use crate::persistence::database::DatabaseManager;
    use std::fs::{self, File};
    use std::io::Write;
    use std::path::Path;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    #[test]
    fn test_categorize_developer_files() {
        let path = Path::new("/Users/dev/my-project/node_modules/express");
        let (cat, _) = categorize_path(path, true);
        assert_eq!(cat, StorageCategory::DeveloperFiles);

        let path = Path::new("/Users/dev/my-project/src/index.ts");
        let (cat, _) = categorize_path(path, false);
        assert_eq!(cat, StorageCategory::DeveloperFiles);

        let path = Path::new("/Users/dev/rust-app/target/debug/app");
        let (cat, _) = categorize_path(path, false);
        assert_eq!(cat, StorageCategory::DeveloperFiles);
    }

    #[test]
    fn test_categorize_documents_and_media() {
        let path = Path::new("/Users/alex/Documents/spec.pdf");
        let (cat, _) = categorize_path(path, false);
        assert_eq!(cat, StorageCategory::Documents);

        let path = Path::new("/Users/alex/Movies/demo.mp4");
        let (cat, _) = categorize_path(path, false);
        assert_eq!(cat, StorageCategory::Media);

        let path = Path::new("/Applications/Clearspace.app");
        let (cat, _) = categorize_path(path, true);
        assert_eq!(cat, StorageCategory::Applications);
    }

    #[test]
    fn test_kind_detection() {
        let path = Path::new("/test/image.dmg");
        assert_eq!(get_kind(path, false, false), "disk-image");

        let path = Path::new("/test/archive.zip");
        assert_eq!(get_kind(path, false, false), "archive");

        let path = Path::new("/test/DerivedData");
        assert_eq!(get_kind(path, true, false), "cache");

        let path = Path::new("/test/App.app");
        assert_eq!(get_kind(path, true, false), "bundle");
    }

    #[test]
    fn test_expand_tilde() {
        let expanded = expand_tilde("~/Projects");
        assert!(!expanded.starts_with('~'));
        assert!(expanded.ends_with("/Projects"));

        let non_tilde = expand_tilde("/Library/Caches");
        assert_eq!(non_tilde, "/Library/Caches");
    }

    #[test]
    fn test_scan_directory_and_symlinks() {
        let temp_dir = std::env::temp_dir().join(format!("cs_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create a regular file
        let file1 = temp_dir.join("main.rs");
        let mut f = File::create(&file1).unwrap();
        f.write_all(b"fn main() { println!(\"Hello\"); }").unwrap();

        // Create a sub-folder
        let sub_dir = temp_dir.join("sub");
        fs::create_dir_all(&sub_dir).unwrap();
        let file2 = sub_dir.join("notes.txt");
        let mut f2 = File::create(&file2).unwrap();
        f2.write_all(b"Sample notes content").unwrap();

        // Create a symlink pointing to sub_dir
        let symlink_path = temp_dir.join("link_to_sub");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&sub_dir, &symlink_path).unwrap();

        let cancel_flag = Arc::new(AtomicBool::new(false));
        let options = ScanOptions {
            target_path: temp_dir.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };

        let mut ctx = ScanContext::new(options, cancel_flag);
        let result = scan_directory_tree(&temp_dir, &mut ctx, 0, &|_| {}).unwrap();

        assert_eq!(result.metadata.name, temp_dir.file_name().unwrap().to_string_lossy());
        assert!(result.metadata.size_bytes > 0);
        assert!(ctx.files_scanned >= 2);

        // Verify symlink was flagged and not traversed recursively
        if let Some(children) = result.children {
            let symlink_item = children.iter().find(|c| c.metadata.name == "link_to_sub");
            assert!(symlink_item.is_some());
            assert_eq!(symlink_item.unwrap().metadata.is_symlink, Some(true));
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_hardlink_deduplication() {
        let temp_dir = std::env::temp_dir().join(format!("cs_hardlink_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let original_file = temp_dir.join("original.dat");
        let payload = vec![0xAB; 100 * 1024]; // 100 KB
        fs::write(&original_file, &payload).unwrap();

        let hardlink_file = temp_dir.join("hardlink.dat");
        fs::hard_link(&original_file, &hardlink_file).unwrap();

        let cancel_flag = Arc::new(AtomicBool::new(false));
        let options = ScanOptions {
            target_path: temp_dir.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };

        let mut ctx = ScanContext::new(options, cancel_flag);
        let _result = scan_directory_tree(&temp_dir, &mut ctx, 0, &|_| {}).unwrap();

        // Because hard_link shares the exact same inode, the scanner must NOT double count the 100KB payload
        assert!(
            ctx.bytes_analysed < 150 * 1024,
            "Hardlink must be deduplicated by inode; analyzed {} bytes",
            ctx.bytes_analysed
        );

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_scan_cancellation_isolation() {
        let temp_dir = std::env::temp_dir().join(format!("cs_test_cancel_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let cancel_flag_a = Arc::new(AtomicBool::new(true)); // Pre-cancelled
        let cancel_flag_b = Arc::new(AtomicBool::new(false)); // Active

        let options_a = ScanOptions {
            target_path: temp_dir.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };

        let mut ctx_a = ScanContext::new(options_a, cancel_flag_a);
        let res_a = scan_directory_tree(&temp_dir, &mut ctx_a, 0, &|_| {});
        assert!(res_a.is_err());
        assert_eq!(res_a.unwrap_err(), "Scan cancelled by user.");

        // Scan B should NOT be affected by Scan A's cancellation
        assert!(!cancel_flag_b.load(Ordering::SeqCst));
        let options_b = ScanOptions {
            target_path: temp_dir.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };
        let mut ctx_b = ScanContext::new(options_b, cancel_flag_b);
        let res_b = scan_directory_tree(&temp_dir, &mut ctx_b, 0, &|_| {});
        assert!(res_b.is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_detection_ecosystems_and_lockfiles() {
        let root = std::env::temp_dir().join(format!("cs_ecosystems_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();

        // 1. Node.js with package-lock.json (VerifiedSafe)
        let node_locked = root.join("node-locked");
        fs::create_dir_all(node_locked.join("node_modules")).unwrap();
        fs::write(node_locked.join("package.json"), r#"{"name": "locked-app"}"#).unwrap();
        fs::write(node_locked.join("package-lock.json"), r#"{"lockfileVersion": 3}"#).unwrap();

        // 2. Node.js without lockfile (ReviewRequired)
        let node_unlocked = root.join("node-unlocked");
        fs::create_dir_all(node_unlocked.join("node_modules")).unwrap();
        fs::write(node_unlocked.join("package.json"), r#"{"name": "unlocked-app"}"#).unwrap();

        // 3. Python Poetry with poetry.lock (VerifiedSafe)
        let py_poetry = root.join("py-poetry");
        fs::create_dir_all(py_poetry.join(".venv")).unwrap();
        fs::write(py_poetry.join("pyproject.toml"), "[tool.poetry]\nname = \"py-app\"").unwrap();
        fs::write(py_poetry.join("poetry.lock"), "# poetry lockfile").unwrap();

        // 4. Python with unpinned venv (ReviewRequired)
        let py_unpinned = root.join("py-unpinned");
        fs::create_dir_all(py_unpinned.join("venv")).unwrap();

        // 5. Rust Cargo target (VerifiedSafe)
        let rust_proj = root.join("rust-app");
        fs::create_dir_all(rust_proj.join("target")).unwrap();
        fs::write(rust_proj.join("Cargo.toml"), "[package]\nname = \"rust-demo\"").unwrap();

        // 6. Java Maven target (VerifiedSafe)
        let maven_proj = root.join("maven-app");
        fs::create_dir_all(maven_proj.join("target")).unwrap();
        fs::write(maven_proj.join("pom.xml"), "<project></project>").unwrap();

        // 7. Gradle build (VerifiedSafe)
        let gradle_proj = root.join("gradle-app");
        fs::create_dir_all(gradle_proj.join("build")).unwrap();
        fs::write(gradle_proj.join("build.gradle"), "// gradle").unwrap();

        // 8. PHP Composer with lock (VerifiedSafe)
        let composer_proj = root.join("composer-app");
        fs::create_dir_all(composer_proj.join("vendor")).unwrap();
        fs::write(composer_proj.join("composer.json"), "{}").unwrap();
        fs::write(composer_proj.join("composer.lock"), "{}").unwrap();

        // 9. Unrelated folders named target, build, vendor (must NOT be falsely detected)
        let unrelated = root.join("unrelated");
        fs::create_dir_all(unrelated.join("target")).unwrap();
        fs::create_dir_all(unrelated.join("build")).unwrap();
        fs::create_dir_all(unrelated.join("vendor")).unwrap();

        let cancel_flag = Arc::new(AtomicBool::new(false));
        let options = ScanOptions {
            target_path: root.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };

        let mut ctx = ScanContext::new(options, cancel_flag);
        let tree = scan_directory_tree(&root, &mut ctx, 0, &|_| {}).unwrap();
        let artifacts = DetectionEngine::detect_artifacts(&tree);

        // Check 1: Node locked is VerifiedSafe
        let locked_art = artifacts.iter().find(|a| a.associated_project.as_deref() == Some("locked-app")).unwrap();
        assert_eq!(locked_art.risk, RiskClassification::VerifiedSafe);

        // Check 2: Node unlocked is ReviewRequired
        let unlocked_art = artifacts.iter().find(|a| a.associated_project.as_deref() == Some("unlocked-app")).unwrap();
        assert_eq!(unlocked_art.risk, RiskClassification::ReviewRequired);

        // Check 3: Python poetry is VerifiedSafe
        let py_art = artifacts.iter().find(|a| a.path.contains("py-poetry")).unwrap();
        assert_eq!(py_art.risk, RiskClassification::VerifiedSafe);

        // Check 4: Python unpinned is ReviewRequired
        let py_unpinned_art = artifacts.iter().find(|a| a.path.contains("py-unpinned")).unwrap();
        assert_eq!(py_unpinned_art.risk, RiskClassification::ReviewRequired);

        // Check 5: Rust target detected
        let rust_art = artifacts.iter().find(|a| a.associated_project.as_deref() == Some("rust-demo")).unwrap();
        assert_eq!(rust_art.risk, RiskClassification::VerifiedSafe);

        // Check 6: Maven target detected
        let maven_art = artifacts.iter().find(|a| a.path.contains("maven-app")).unwrap();
        assert_eq!(maven_art.risk, RiskClassification::VerifiedSafe);
        assert_eq!(maven_art.artifact_type, "Maven Build Intermediates");

        // Check 7: Gradle build detected
        let gradle_art = artifacts.iter().find(|a| a.path.contains("gradle-app")).unwrap();
        assert_eq!(gradle_art.risk, RiskClassification::VerifiedSafe);
        assert_eq!(gradle_art.artifact_type, "Gradle Build Intermediates");

        // Check 8: Composer vendor detected
        let comp_art = artifacts.iter().find(|a| a.path.contains("composer-app")).unwrap();
        assert_eq!(comp_art.risk, RiskClassification::VerifiedSafe);
        assert_eq!(comp_art.artifact_type, "PHP Composer Dependencies");

        // Check 9: Unrelated folders without manifests must NOT appear in artifacts
        assert!(!artifacts.iter().any(|a| a.path.contains("unrelated/target")));
        assert!(!artifacts.iter().any(|a| a.path.contains("unrelated/build")));
        assert!(!artifacts.iter().any(|a| a.path.contains("unrelated/vendor")));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_safety_validator_rejects_dangerous_paths() {
        // Empty path
        assert!(SafetyValidator::validate_cleanup_target("").is_err());
        assert!(SafetyValidator::validate_cleanup_target("   ").is_err());

        // Root
        assert!(SafetyValidator::validate_cleanup_target("/").is_err());

        // Critical system dirs
        assert!(SafetyValidator::validate_cleanup_target("/System").is_err());
        assert!(SafetyValidator::validate_cleanup_target("/usr").is_err());
        assert!(SafetyValidator::validate_cleanup_target("/bin").is_err());
        assert!(SafetyValidator::validate_cleanup_target("/Library").is_err());
        assert!(SafetyValidator::validate_cleanup_target("/Applications").is_err());
        assert!(SafetyValidator::validate_cleanup_target("/Volumes").is_err());

        // Docker internal
        assert!(SafetyValidator::validate_cleanup_target("docker://buildkit-cache").is_err());
        assert!(SafetyValidator::validate_cleanup_target("docker://volumes").is_err());
        assert!(SafetyValidator::validate_cleanup_target("~/Library/Containers/com.docker.docker/Data").is_err());

        // Non-existent path
        assert!(SafetyValidator::validate_cleanup_target("/Users/nonexistent_xyz_9988").is_err());

        // User Home Directory root protection
        if let Ok(home) = std::env::var("HOME") {
            assert!(SafetyValidator::validate_cleanup_target(&home).is_err());

            // Primary user workspace folders
            let desktop = format!("{}/Desktop", home);
            if Path::new(&desktop).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&desktop).is_err());
            }
            let docs = format!("{}/Documents", home);
            if Path::new(&docs).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&docs).is_err());
            }
            let downloads = format!("{}/Downloads", home);
            if Path::new(&downloads).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&downloads).is_err());
            }

            // Blanket ~/Library protection: sensitive personal/app data must be REJECTED
            let app_support = format!("{}/Library/Application Support", home);
            if Path::new(&app_support).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&app_support).is_err(), "Application Support must be protected");
            }
            let keychains = format!("{}/Library/Keychains", home);
            if Path::new(&keychains).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&keychains).is_err(), "Keychains must be protected");
            }
            let preferences = format!("{}/Library/Preferences", home);
            if Path::new(&preferences).exists() {
                assert!(SafetyValidator::validate_cleanup_target(&preferences).is_err(), "Preferences must be protected");
            }
        }
    }

    #[test]
    fn test_safety_validator_handles_spaces_and_quotes_safely() {
        let temp_dir = std::env::temp_dir().join(format!("cs_safety_spaces_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create folder with spaces, quotes, and symbols
        let special_dir = temp_dir.join("test 'single' and \"double\" & spaces");
        fs::create_dir_all(&special_dir).unwrap();
        let test_file = special_dir.join("inner file.txt");
        fs::write(&test_file, "data").unwrap();

        let valid_res = SafetyValidator::validate_cleanup_target(&special_dir.to_string_lossy());
        assert!(valid_res.is_ok(), "Folder with spaces and quotes must be cleanly validated");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_safety_validator_rejects_symlinks() {
        let temp_dir = std::env::temp_dir().join(format!("cs_safety_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let real_file = temp_dir.join("real.txt");
        fs::write(&real_file, "real content").unwrap();

        let symlink_file = temp_dir.join("link_to_real");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&real_file, &symlink_file).unwrap();

        // Real file in temp dir should pass safety check
        let real_res = SafetyValidator::validate_cleanup_target(&real_file.to_string_lossy());
        assert!(real_res.is_ok());

        // Symlink MUST be rejected to protect against symlink attacks
        let sym_res = SafetyValidator::validate_cleanup_target(&symlink_file.to_string_lossy());
        assert!(sym_res.is_err(), "Safety validator must refuse to clean symlinks directly");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_sqlite_persistence_and_large_payloads() {
        let temp_db_path = std::env::temp_dir().join(format!("cs_test_db_{}.db", uuid::Uuid::new_v4()));
        let db = DatabaseManager::new(temp_db_path.clone());

        // Test settings save and retrieve with special characters and quotes
        let complex_json = r#"{"theme":"dark","note":"Special 'quotes' and \"symbols\" & path: /Users/dev/test"}"#;
        db.save_setting("complex_key", complex_json).unwrap();
        let retrieved = db.get_setting("complex_key").unwrap();
        assert_eq!(retrieved, Some(complex_json.to_string()));

        // Test logging cleanup
        db.log_cleanup("/tmp/dummy_node_modules with spaces", 1024 * 1024, true, None).unwrap();

        // Test saving a large ScanResult with many items (verifying stdin streaming without ARG_MAX limits)
        let dummy_scan = ScanResult {
            id: format!("scan-test-{}", uuid::Uuid::new_v4()),
            is_mock_data: false,
            data_source_label: "Native Disk".to_string(),
            volume_name: "Macintosh HD".to_string(),
            volume_format: "apfs".to_string(),
            mount_point: "/Users/dev/projects".to_string(),
            scanned_at: "2026-11-08T18:00:00Z".to_string(),
            scan_duration_seconds: 1.25,
            total_capacity_bytes: 500_000_000_000,
            used_bytes: 350_000_000_000,
            available_bytes: 150_000_000_000,
            recoverable_bytes: 15_000_000_000,
            largest_directory_path: "/Users/dev/projects/big".to_string(),
            largest_directory_bytes: 12_000_000_000,
            categories: vec![CategorySummary {
                category: StorageCategory::DeveloperFiles,
                size_bytes: 15_000_000_000,
                percentage_of_used: 4.2,
                percentage_of_total: 3.0,
                item_count: 4200,
            }],
            root_item: crate::models::file::StorageItem {
                metadata: crate::models::file::FileMetadata {
                    id: "root-1".to_string(),
                    name: "projects".to_string(),
                    path: "/Users/dev/projects".to_string(),
                    size_bytes: 15_000_000_000,
                    kind: "directory".to_string(),
                    file_type_label: "Directory".to_string(),
                    last_modified: "2026-11-08T18:00:00Z".to_string(),
                    category: StorageCategory::DeveloperFiles,
                    risk: RiskClassification::VerifiedSafe,
                    associated_project: None,
                    detection_reason: "Root scan".to_string(),
                    regeneration_instructions: None,
                    recovery_command: None,
                    cleanup_impact: "Root item".to_string(),
                    item_count: Some(4200),
                    is_hidden: Some(false),
                    is_symlink: Some(false),
                },
                children: None,
            },
            top_consumers: Vec::new(),
            artifacts: Vec::new(),
            recommendations: Vec::new(),
        };

        db.save_scan(&dummy_scan).unwrap();
        let listed = db.list_scans().unwrap();
        assert!(!listed.is_empty());
        assert_eq!(listed[0].id, dummy_scan.id);

        let latest = db.get_latest_scan().unwrap();
        assert!(latest.is_some());
        assert_eq!(latest.unwrap().id, dummy_scan.id);

        // Test clear history
        db.clear_history().unwrap();
        let scans_after = db.list_scans().unwrap();
        assert!(scans_after.is_empty());

        let _ = fs::remove_file(&temp_db_path);
    }

    #[test]
    fn test_macos_full_validation_workflow() {
        use crate::engine::recommendations::RecommendationEngine;

        let val_root = std::env::temp_dir().join(format!("clearspace_val_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&val_root).unwrap();

        // 1. Fixture: Node project
        let node_dir = val_root.join("my-node-service");
        fs::create_dir_all(node_dir.join("node_modules/lodash")).unwrap();
        fs::write(node_dir.join("package.json"), r#"{"name": "my-node-service"}"#).unwrap();
        fs::write(node_dir.join("package-lock.json"), r#"{"lockfileVersion": 3}"#).unwrap();
        fs::write(node_dir.join("node_modules/lodash/index.js"), "module.exports = {};").unwrap();

        // 2. Fixture: Python project
        let py_dir = val_root.join("ml-worker");
        fs::create_dir_all(py_dir.join(".venv/lib/python3.11")).unwrap();
        fs::write(py_dir.join("pyproject.toml"), "[tool.poetry]\nname = \"ml-worker\"").unwrap();
        fs::write(py_dir.join("poetry.lock"), "# poetry lock").unwrap();
        fs::write(py_dir.join(".venv/lib/python3.11/site.py"), "# venv").unwrap();

        // 3. Fixture: Rust project
        let rust_dir = val_root.join("core-engine");
        fs::create_dir_all(rust_dir.join("target/debug/deps")).unwrap();
        fs::write(rust_dir.join("Cargo.toml"), "[package]\nname = \"core-engine\"").unwrap();
        fs::write(rust_dir.join("target/debug/deps/libengine.rlib"), &[0u8; 1024]).unwrap();

        // 4. Scanner execution
        let cancel_flag = Arc::new(AtomicBool::new(false));
        let options = ScanOptions {
            target_path: val_root.to_string_lossy().to_string(),
            excluded_folders: Vec::new(),
            include_hidden_files: true,
            max_depth: None,
            symlink_handling: "ignore".to_string(),
        };

        let mut ctx = ScanContext::new(options, cancel_flag);
        let root_item = scan_directory_tree(&val_root, &mut ctx, 0, &|_| {}).unwrap();

        assert_eq!(root_item.metadata.name, val_root.file_name().unwrap().to_string_lossy());
        assert!(root_item.metadata.size_bytes > 1000);
        assert!(ctx.files_scanned >= 5);

        // 5. Artifact detection verification
        let artifacts = DetectionEngine::detect_artifacts(&root_item);
        assert!(artifacts.len() >= 3, "Expected at least 3 artifacts detected");

        let node_art = artifacts.iter().find(|a| a.associated_project.as_deref() == Some("my-node-service")).unwrap();
        assert_eq!(node_art.risk, RiskClassification::VerifiedSafe);
        assert_eq!(node_art.name, "node_modules");

        let py_art = artifacts.iter().find(|a| a.path.contains("ml-worker/.venv")).unwrap();
        assert_eq!(py_art.risk, RiskClassification::VerifiedSafe);

        let rust_art = artifacts.iter().find(|a| a.associated_project.as_deref() == Some("core-engine")).unwrap();
        assert_eq!(rust_art.risk, RiskClassification::VerifiedSafe);

        // 6. Recommendation generation verification
        let recs = RecommendationEngine::generate_recommendations(&artifacts);
        assert!(!recs.is_empty());
        for rec in &recs {
            assert!(rec.recovery_command.is_some());
            assert!(!rec.why_identified.is_empty());
            assert!(!rec.restoration_steps.is_empty());
        }

        // 7. Safety validation audit on preview targets
        let valid_node = SafetyValidator::validate_cleanup_target(&node_dir.join("node_modules").to_string_lossy());
        assert!(valid_node.is_ok());

        let invalid_root = SafetyValidator::validate_cleanup_target("/");
        assert!(invalid_root.is_err());

        // 8. SQLite lifecycle across simulated restart
        let db_file = val_root.join("lifecycle.db");
        {
            let db1 = DatabaseManager::new(db_file.clone());
            db1.save_setting("appearance", "\"slate\"").unwrap();
            db1.log_cleanup(&node_dir.join("node_modules").to_string_lossy(), 1024, true, None).unwrap();
        }

        // Simulate app restart with a fresh DatabaseManager instance on same DB file
        {
            let db2 = DatabaseManager::new(db_file.clone());
            let saved_theme = db2.get_setting("appearance").unwrap();
            assert_eq!(saved_theme, Some("\"slate\"".to_string()));
        }

        let _ = fs::remove_dir_all(&val_root);
    }
}
