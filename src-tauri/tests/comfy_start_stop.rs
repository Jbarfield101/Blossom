use blossom_lib::commands::{comfy_start, comfy_stop, __has_comfy_child};
use std::{env, fs};
use tauri::Manager;

#[tokio::test]
async fn start_and_stop_comfy() {
    let _rt = tauri::test::mock_runtime();
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    let _webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let window = app.get_window("main").unwrap();

    let dir = tempfile::tempdir().unwrap();
    fs::write(
        dir.path().join("main.py"),
        "import time\nwhile True: time.sleep(0.1)\n",
    )
    .unwrap();
    env::set_var("BLOSSOM_PYTHON_PATH", "python3");

    assert!(!__has_comfy_child());
    comfy_start(window, dir.path().to_string_lossy().to_string())
        .await
        .unwrap();
    assert!(__has_comfy_child());
    comfy_stop().await.unwrap();
    assert!(!__has_comfy_child());
}
