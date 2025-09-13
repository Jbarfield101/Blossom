// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod python_helpers;
mod task_queue;
mod video_tools;

use task_queue::TaskQueue;
use tauri::Manager;

fn main() {
    env_logger::init();
    let queue = TaskQueue::new(1, 90.0, 90.0);
    tauri::Builder::default()
        .manage(queue)
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tauri::async_runtime::spawn(async move {
                    let _ = crate::commands::comfy_stop().await;
                    let _ = crate::commands::stop_ollama().await;
                });
            }
        })
        .setup(|app| {
            let handle = app.handle();
            app.state::<TaskQueue>().set_app_handle(handle.clone());
            if let Some(window) = handle.get_webview_window("main") {
                let app = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Ensure fresh servers each app launch
                    if let Err(e) = commands::start_ollama(app.clone()).await {
                        log::warn!("failed to start Ollama: {e}");
                    }
                    if let Err(e) = commands::comfy_start(app, "".into()).await {
                        log::warn!("failed to start ComfyUI: {e}");
                    }
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::dj_mix,
            commands::generate_ambience,
            commands::higgs_tts,
            // ComfyUI:
            commands::comfy_status,
            commands::comfy_start,
            commands::comfy_stop,
            // Ollama general chat:
            commands::start_ollama,
            commands::stop_ollama,
            commands::general_chat,
            commands::detect_intent,
            commands::retrieve_context,
            // PDF tools:
            commands::pdf_add,
            commands::pdf_remove,
            commands::pdf_list,
            commands::pdf_search,
            commands::vault_search,
            commands::pdf_ingest,
            commands::parse_spell_pdf,
            commands::parse_rule_pdf,
            commands::parse_lore_pdf,
            // Blender:
            commands::blender_run_script,
            commands::save_npc,
            commands::list_npcs,
            commands::append_npc_log,
            commands::read_npc_log,
            commands::clear_npc_log,
            commands::save_rule,
            commands::list_rules,
            commands::save_spell,
            commands::list_spells,
            commands::save_lore,
            commands::list_lore,
            // Paths:
            python_helpers::load_paths,
            python_helpers::save_paths,
            python_helpers::detect_python,
            // Shorts:
            video_tools::load_shorts,
            video_tools::save_shorts,
            video_tools::generate_short,
            // Retro TV and video tools:
            video_tools::save_retro_tv_video,
            video_tools::loop_video,
            // Transcription:
            commands::load_transcripts,
            commands::transcribe_audio,
            commands::summarize_session,
            commands::system_info,
            commands::enqueue_task,
            commands::task_status,
            commands::cancel_task,
            commands::list_tasks,
            commands::set_task_limits,
            commands::save_temp_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
