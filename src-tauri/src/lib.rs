use tauri::Manager;
use base64::Engine;
use std::fs;

#[tauri::command]
fn save_file(app: tauri::AppHandle, data_base64: String, filename: String) -> Result<(), String> {
    // Decode base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data_base64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    // Show save dialog
    use tauri_plugin_dialog::DialogExt;
    let filter_name = if filename.ends_with(".png") { "PNG" } else { "SVG" };
    let filter_ext = if filename.ends_with(".png") { "png" } else { "svg" };
    let path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter(filter_name, &[filter_ext])
        .blocking_save_file();

    match path {
        Some(p) => {
            let path = p.as_path().unwrap();
            fs::write(path, &bytes).map_err(|e| format!("Write failed: {}", e))?;
            Ok(())
        }
        None => Err("User cancelled".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
