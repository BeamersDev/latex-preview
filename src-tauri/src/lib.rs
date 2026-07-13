use tauri::Manager;
use base64::Engine;
use std::fs;

#[tauri::command]
fn pick_save_path(app: tauri::AppHandle, suggested: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .set_file_name(&suggested)
        .add_filter("PNG 图像", &["png"])
        .add_filter("SVG 图像", &["svg"])
        .blocking_save_file();
    match path {
        Some(p) => {
            let path = p.as_path().unwrap().to_string_lossy().to_string();
            Ok(path)
        }
        None => Err("User cancelled".into()),
    }
}

#[tauri::command]
fn write_file(path: String, data_base64: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data_base64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;
    fs::write(&path, &bytes).map_err(|e| format!("Write failed: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![pick_save_path, write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
