use std::{env, fs};

use blossom_lib::commands::{higgs_tts, save_paths};
use tempfile::tempdir;
use tauri::{test::mock_app, Manager};
use which::which;

#[tokio::test]
async fn higgs_tts_reports_missing_python_and_script() {
    // isolate configuration
    let temp_home = tempdir().unwrap();
    env::set_var("HOME", temp_home.path());

    // create temporary repo with script for first check
    let temp_repo = tempdir().unwrap();
    let script_dir = temp_repo.path().join("src-tauri").join("python");
    fs::create_dir_all(&script_dir).unwrap();
    fs::write(script_dir.join("higgs_tts.py"), "").unwrap();
    env::set_current_dir(temp_repo.path()).unwrap();

    // case: python missing
    let app = mock_app();
    let handle = app.app_handle().clone();
    let missing = temp_home.path().join("no_python_here");
    env::set_var("BLOSSOM_PYTHON_PATH", missing.to_string_lossy().to_string());
    let err = higgs_tts(handle, "hi".into(), "spk".into()).await.unwrap_err();
    assert!(err.contains("Python not found"));

    // case: script missing
    let py = which("python3").unwrap();
    save_paths(Some(py.to_string_lossy().to_string()), None)
        .await
        .unwrap();
    let temp_dir = tempdir().unwrap();
    env::set_current_dir(&temp_dir).unwrap();
    let app = mock_app();
    let handle = app.app_handle().clone();
    let err = higgs_tts(handle, "hi".into(), "spk".into()).await.unwrap_err();
    assert!(err.contains("Script not found"));
}
