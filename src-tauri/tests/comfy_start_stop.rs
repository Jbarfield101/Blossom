use blossom_lib::commands::{comfy_start, comfy_stop, __has_comfy_child};
use std::{env, fs};

#[tokio::test]
async fn start_and_stop_comfy() {
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    let window = tauri::WindowBuilder::new(&app, "main")
        .build()
        .unwrap();

    let dir = tempfile::tempdir().unwrap();
    fs::write(
        dir.path().join("main.py"),
        "import time\nwhile True: time.sleep(0.1)\n",
    )
    .unwrap();
    env::set_var("HOME", dir.path());
    env::set_var("BLOSSOM_PYTHON_PATH", "/usr/bin/python3");

    assert!(!__has_comfy_child());
    comfy_start(window, dir.path().to_string_lossy().to_string())
        .await
        .unwrap();
    assert!(__has_comfy_child());
    comfy_stop().await.unwrap();
    assert!(!__has_comfy_child());
}
