// src-tauri/src/main.rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      commands::lofi_generate_gpu,
      commands::lofi_generate_gpu_stream, // <-- add this
      commands::run_lofi_song,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
