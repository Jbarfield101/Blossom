use std::{fs, process::Command, time::Duration};

use blossom_lib::{comfy_start, comfy_status};
use tauri::{test::mock_app, Manager, WebviewWindowBuilder};
use tempfile::tempdir;
use tokio::time::sleep;

#[tokio::test]
async fn comfy_status_false_after_force_kill() {
    let dir = tempdir().unwrap();
    fs::write(
        dir.path().join("main.py"),
        "import time, os\nopen('pid', 'w').write(str(os.getpid()))\nwhile True:\n    time.sleep(1)\n",
    )
    .unwrap();

    let app = mock_app();
    let _webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let window = app.get_window("main").unwrap();

    comfy_start(window, dir.path().to_string_lossy().to_string())
        .await
        .unwrap();

    let pid_path = dir.path().join("pid");
    for _ in 0..50 {
        if pid_path.exists() {
            break;
        }
        sleep(Duration::from_millis(100)).await;
    }
    let pid: i32 = fs::read_to_string(&pid_path).unwrap().parse().unwrap();

    Command::new("kill").arg("-9").arg(pid.to_string()).status().unwrap();

    for _ in 0..50 {
        if !comfy_status().await.unwrap() {
            return;
        }
        sleep(Duration::from_millis(100)).await;
    }
    panic!("comfy_status never reported false");
}
