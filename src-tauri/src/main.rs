// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod stocks;
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

fn main() {
    tauri::Builder::default()
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
            commands::run_lofi_song,
            commands::generate_album,
            commands::cancel_album,
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
            // Paths:
            commands::load_paths,
            commands::save_paths,
            // Stocks:
            commands::stocks_fetch,
            commands::stock_forecast,
            // Shorts:
            commands::load_shorts,
            commands::save_shorts,
            commands::generate_short,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
