use std::path::PathBuf;

use blossom_lib::commands::generate_ambience;
use tauri::{test::mock_app, Listener, Manager, WebviewWindowBuilder};
use tokio::sync::mpsc;

#[tokio::test]
async fn generate_ambience_logs_output() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir.parent().unwrap();
    std::env::set_current_dir(&repo_root).unwrap();

    let app = mock_app();
    let window = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();

    let (tx, mut rx) = mpsc::unbounded_channel();
    let _id = window.listen("ambience_log", move |e| {
        tx.send(e.payload().to_string()).unwrap();
    });

    let handle = app.app_handle().clone();
    generate_ambience(handle).await.expect("generate ambience");

    let mut logs: Vec<String> = Vec::new();
    while let Ok(line) = rx.try_recv() {
        logs.push(line);
    }
    assert!(logs.iter().any(|l| l.contains("generated")));

    let ambience_dir = repo_root.join("src-tauri/python/samples/ambience");
    if ambience_dir.exists() {
        let _ = std::fs::remove_dir_all(ambience_dir);
    }
}
