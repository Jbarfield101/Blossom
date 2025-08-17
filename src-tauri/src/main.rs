// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = commands::fetch_big_brother_summary(handle, Some(true)).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::lofi_generate_gpu,
            commands::run_lofi_song,
            // ComfyUI:
            commands::comfy_status,
            commands::comfy_start,
            commands::comfy_stop,
            // Ollama general chat:
            commands::start_ollama,
            commands::stop_ollama,
            commands::general_chat,
            // PDF tools:
            commands::pdf_add,
            commands::pdf_remove,
            commands::pdf_list,
            commands::pdf_search,
            // Blender:
            commands::blender_run_script,
            commands::save_npc,
            commands::list_npcs,
            // News scraping:
            commands::fetch_big_brother_news,
            commands::fetch_big_brother_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
