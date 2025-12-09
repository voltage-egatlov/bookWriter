#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bookwriter_core::{bk_format::BkParser, Book};
use std::path::Path;

#[tauri::command]
async fn open_file_dialog() -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let path = FileDialogBuilder::new()
        .add_filter("Book Files", &["bk"])
        .add_filter("All Files", &["*"])
        .pick_file();

    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn save_file_dialog(default_name: String) -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let path = FileDialogBuilder::new()
        .add_filter("Book Files", &["bk"])
        .set_file_name(&default_name)
        .save_file();

    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn load_bk_file(path: String) -> Result<Book, String> {
    let book = BkParser::parse_file(Path::new(&path))
        .map_err(|e| format!("Parse error: {}\n\nHelp: {}", e, e.help_message()))?;
    Ok(book)
}

#[tauri::command]
async fn save_bk_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("Failed to save file: {}", e))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_dialog,
            load_bk_file,
            save_bk_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
