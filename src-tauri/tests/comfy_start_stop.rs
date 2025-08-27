use blossom_lib::commands::{comfy_start, comfy_stop, __has_comfy_child};
use std::{env, fs};
use which::which;

#[tokio::test]
async fn start_and_stop_comfy() {
    let _rt = <tauri::test::MockRuntime as tauri_runtime::Runtime<()>>::new(Default::default()).unwrap();
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let window = webview.as_ref().window();

    let dir = tempfile::tempdir().unwrap();
    fs::write(
        dir.path().join("main.py"),
        "import time\nwhile True: time.sleep(0.1)\n",
    )
    .unwrap();
    env::set_var("BLOSSOM_PYTHON_PATH", which("python3").unwrap());

    assert!(!__has_comfy_child());
    comfy_start(window, dir.path().to_string_lossy().to_string())
        .await
        .unwrap();
    assert!(__has_comfy_child());
    comfy_stop().await.unwrap();
    assert!(!__has_comfy_child());
}
