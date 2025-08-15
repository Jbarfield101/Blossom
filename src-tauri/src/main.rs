// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      commands::lofi_generate_gpu,
      commands::lofi_generate_gpu_stream,
      commands::run_lofi_song,
      // ComfyUI:
      commands::comfy_status,
      commands::comfy_start,
      commands::comfy_stop,
      // Ollama general chat:
      commands::start_ollama,
      commands::general_chat,
      // Blender:
      commands::blender_run_script,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
