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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_file_roundtrip() {
        let dir = std::env::temp_dir().join("latex_preview_test_write");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("output.png").to_string_lossy().to_string();
        let input = b"hello latex world!";
        let b64 = base64::engine::general_purpose::STANDARD.encode(input);

        write_file(path.clone(), b64).unwrap();

        let written = std::fs::read(&path).unwrap();
        assert_eq!(written, input);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_empty_data() {
        let dir = std::env::temp_dir().join("latex_preview_test_empty");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("empty.svg").to_string_lossy().to_string();
        let b64 = base64::engine::general_purpose::STANDARD.encode(b"");

        write_file(path.clone(), b64).unwrap();

        let written = std::fs::read(&path).unwrap();
        assert!(written.is_empty());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_invalid_base64() {
        let dir = std::env::temp_dir().join("latex_preview_test_bad64");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("bad.png").to_string_lossy().to_string();
        let result = write_file(path, "!!!not-base64!!!".into());

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Base64"), "expected Base64 error, got: {err}");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_png_header() {
        // PNG header bytes: 137 80 78 71 13 10 26 10
        let png_header: &[u8] = &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        let rest = b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82";
        let mut data = png_header.to_vec();
        data.extend_from_slice(rest);

        let dir = std::env::temp_dir().join("latex_preview_test_png");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("minimal.png").to_string_lossy().to_string();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&data);

        write_file(path.clone(), b64).unwrap();

        let written = std::fs::read(&path).unwrap();
        assert_eq!(written[..8], [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "written file should be a valid PNG");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_svg_content() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>"#;

        let dir = std::env::temp_dir().join("latex_preview_test_svg");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("test.svg").to_string_lossy().to_string();
        let b64 = base64::engine::general_purpose::STANDARD.encode(svg);

        write_file(path.clone(), b64).unwrap();

        let written = std::fs::read(&path).unwrap();
        assert!(String::from_utf8_lossy(&written).contains("<svg"),
            "written content should be SVG XML");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_large_data() {
        let large: Vec<u8> = (0..10_000).map(|i| (i % 256) as u8).collect();

        let dir = std::env::temp_dir().join("latex_preview_test_large");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("large.bin").to_string_lossy().to_string();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&large);

        write_file(path.clone(), b64).unwrap();

        let written = std::fs::read(&path).unwrap();
        assert_eq!(written.len(), large.len());
        assert_eq!(written, large);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_write_file_invalid_path() {
        // root dir is not writable as a regular file
        let result = write_file("/".into(), base64::engine::general_purpose::STANDARD.encode(b"x"));
        assert!(result.is_err(), "writing to root should fail");
        let err = result.unwrap_err();
        assert!(err.contains("failed") || err.contains("denied") || err.contains("error"),
            "expected a filesystem error, got: {err}");
    }
}
