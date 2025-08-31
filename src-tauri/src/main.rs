// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod stocks;
mod task_queue;

use std::fs;
use std::path::{Path, PathBuf};
use task_queue::TaskQueue;
use tauri::Manager;
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn sync_sfz_assets() -> std::io::Result<()> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src_dir = manifest_dir.join("../public/sfz_sounds");
    let dest_dir = manifest_dir.join("target/debug/sfz_sounds");
    if !src_dir.exists() {
        return Ok(());
    }
    fs::create_dir_all(&dest_dir)?;
    for entry in fs::read_dir(&src_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("sfz") {
            let file_name = entry.file_name();
            let dest_file = dest_dir.join(&file_name);
            if !dest_file.exists() {
                fs::copy(&path, &dest_file)?;
            }
            if let Some(stem) = path.file_stem() {
                let sample_src = src_dir.join(stem);
                let sample_dest = dest_dir.join(stem);
                if sample_src.is_dir() && !sample_dest.exists() {
                    copy_dir(&sample_src, &sample_dest)?;
                }
            }
        }
    }
    Ok(())
}

fn main() {
    env_logger::init();
    let queue = TaskQueue::new(1, 90.0, 90.0);
    tauri::Builder::default()
        .manage(queue)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let _ = crate::commands::comfy_stop().await;
                    let _ = crate::commands::stop_ollama().await;
                });
            }
        })
        .setup(|app| {
            let handle = app.handle();
            app.state::<TaskQueue>().set_app_handle(handle.clone());
            if let Err(e) = sync_sfz_assets() {
                log::warn!("sfz asset sync failed: {e}");
            }
            if let Some(window) = handle.get_webview_window("main") {
                let app = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Conditionally convert SFZ FLAC samples to WAV on startup
                    let cfg = crate::commands::get_config();
                    if cfg.sfz_convert_on_start.unwrap_or(true) {
                        if let Err(e) = commands::sfz_convert_flac_to_wav(
                            Some("public/sfz_sounds".into()),
                            Some(false),
                        )
                        .await
                        {
                            log::warn!("sfz flac->wav conversion failed: {e}");
                        }
                    }
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
        .plugin(
            SqlBuilder::default()
                .add_migrations(
                    "sqlite:stocks.db",
                    vec![
                        Migration {
                            version: 1,
                            description: "create stocks cache",
                            sql: "CREATE TABLE IF NOT EXISTS stocks (symbol TEXT PRIMARY KEY, data TEXT, quote_ts INTEGER, hist_ts INTEGER);",
                            kind: MigrationKind::Up,
                        },
                        Migration {
                            version: 2,
                            description: "create stock quote cache",
                            sql: "CREATE TABLE IF NOT EXISTS stock_quotes (ticker TEXT PRIMARY KEY, data TEXT, ts INTEGER);",
                            kind: MigrationKind::Up,
                        },
                        Migration {
                            version: 3,
                            description: "create stock series cache",
                            sql: "CREATE TABLE IF NOT EXISTS stock_series (ticker TEXT, range TEXT, data TEXT, ts INTEGER, PRIMARY KEY(ticker, range));",
                            kind: MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::lofi_generate_gpu,
            commands::run_basic_sfz,
            commands::run_lofi_song,
            commands::generate_song,
            commands::generate_album,
            commands::cancel_album,
            commands::dj_mix,
            commands::generate_ambience,
            commands::sfz_convert_flac_to_wav,
            commands::set_sfz_convert_on_start,
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
            // PDF tools:
            commands::pdf_add,
            commands::pdf_remove,
            commands::pdf_list,
            commands::pdf_search,
            commands::pdf_ingest,
            commands::parse_spell_pdf,
            commands::parse_rule_pdf,
            commands::parse_npc_pdf,
            commands::enqueue_parse_npc_pdf,
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
            commands::load_paths,
            commands::save_paths,
            commands::detect_python,
            // Stocks:
            commands::stocks_fetch,
            commands::stock_forecast,
            commands::fetch_stock_news,
            // Shorts:
            commands::load_shorts,
            commands::save_shorts,
            commands::generate_short,
            // Retro TV:
            commands::save_retro_tv_video,
            commands::loop_video,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
