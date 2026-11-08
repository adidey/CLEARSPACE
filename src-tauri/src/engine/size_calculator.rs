use crate::models::file::StorageCategory;
use std::path::Path;

/// Categorize file or directory based on name, path, and extension
pub fn categorize_path(path: &Path, is_dir: bool) -> (StorageCategory, &'static str) {
    let path_str = path.to_string_lossy();
    let lower_path = path_str.to_lowercase();
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let lower_name = file_name.to_lowercase();

    // Check for developer artifacts first
    if lower_name == "node_modules"
        || lower_path.contains("/node_modules")
        || lower_name == ".git"
        || lower_path.contains("/.git")
        || lower_name == ".venv"
        || lower_path.contains("/.venv")
        || lower_name == "venv"
        || lower_name == "target"
        || lower_path.contains("/target/")
        || lower_name == "deriveddata"
        || lower_path.contains("/deriveddata")
        || lower_name == ".turbo"
        || lower_name == "build"
        || lower_name == "dist"
        || lower_name == ".gradle"
        || lower_name == ".npm"
        || lower_name == ".cargo"
        || lower_name.ends_with(".xcworkspace")
        || lower_name.ends_with(".xcodeproj")
        || lower_path.contains("/projects/")
        || lower_path.contains("/developer/")
        || lower_path.contains("/.cargo/")
        || lower_path.contains("/.rustup/")
        || lower_path.contains("/caches/pip")
        || lower_path.contains("/caches/go-build")
        || lower_path.contains("/pnpm/store")
    {
        return (StorageCategory::DeveloperFiles, "Developer Files");
    }

    if lower_name.ends_with(".app") || lower_path.starts_with("/applications") {
        return (StorageCategory::Applications, "macOS Application");
    }

    if lower_path.starts_with("/system")
        || lower_path.starts_with("/private")
        || lower_path.starts_with("/usr")
        || lower_path.starts_with("/bin")
        || lower_path.starts_with("/sbin")
    {
        return (StorageCategory::SystemData, "System Data");
    }

    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        // Developer source / config files
        "ts" | "tsx" | "js" | "jsx" | "rs" | "py" | "go" | "c" | "cpp" | "h" | "hpp" | "swift"
        | "java" | "kt" | "rb" | "php" | "json" | "toml" | "yaml" | "yml" | "lock" | "xml"
        | "html" | "css" | "scss" | "sh" | "zsh" | "sql" => {
            (StorageCategory::DeveloperFiles, "Developer Source / Config")
        }
        // Documents
        "pdf" | "doc" | "docx" | "txt" | "md" | "markdown" | "pages" | "key" | "numbers"
        | "rtf" | "epub" | "fig" | "sketch" | "csv" | "tsv" | "xls" | "xlsx" => {
            (StorageCategory::Documents, "Document")
        }
        // Media
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "heic" | "raw" | "mp4" | "mov"
        | "m4v" | "mkv" | "avi" | "mp3" | "wav" | "aac" | "flac" | "m4a" | "aiff" => {
            (StorageCategory::Media, "Media File")
        }
        // Archives & Disk Images
        "dmg" | "iso" | "zip" | "tar" | "gz" | "bz2" | "xz" | "7z" | "rar" => {
            (StorageCategory::Documents, "Archive / Disk Image")
        }
        _ => {
            if is_dir {
                (StorageCategory::Other, "Folder")
            } else {
                (StorageCategory::Other, "Generic File")
            }
        }
    }
}

pub fn get_kind(path: &Path, is_dir: bool, is_symlink: bool) -> &'static str {
    if is_symlink {
        return "file";
    }
    if is_dir {
        let name = path.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();
        if name.ends_with(".app") {
            return "bundle";
        }
        if name == "DerivedData" || name == ".turbo" || name == "caches" || name.contains("cache") {
            return "cache";
        }
        return "directory";
    }

    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "dmg" | "iso" => "disk-image",
        "zip" | "tar" | "gz" | "tgz" | "7z" | "rar" | "xip" => "archive",
        _ => "file",
    }
}
