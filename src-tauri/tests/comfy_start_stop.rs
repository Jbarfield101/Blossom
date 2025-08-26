use blossom_lib::commands::{comfy_start, comfy_stop, __has_comfy_child};
use std::{env, fs};
use tauri::test::mock_app;

#[tokio::test]
async fn start_and_stop_comfy() {
    let app = mock_app();
    let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();

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
