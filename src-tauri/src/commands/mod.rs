pub mod cleanup;
pub mod history;
pub mod scanner;

#[tauri::command]
pub fn greet(name: &str) -> String {
    let message = format!("Hello, {name}. CLEARSPACE Rust backend is connected.");
    log::info!("{message}");
    message
}
