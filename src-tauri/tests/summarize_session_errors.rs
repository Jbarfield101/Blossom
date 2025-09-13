use std::{env, fs};

use blossom_lib::commands::summarize_session;
use blossom_lib::python_helpers::save_paths;
use tauri::{test::mock_app, Manager};
use tempfile::tempdir;
use which::which;

#[tokio::test]
async fn summarize_session_reports_missing_model_file() {
    // isolate home directory
    let temp_home = tempdir().unwrap();
    env::set_var("HOME", temp_home.path());

    // ensure transcripts file exists so the script is executed
    let transcript_dir = temp_home.path().join(".blossom");
    fs::create_dir_all(&transcript_dir).unwrap();
    fs::write(transcript_dir.join("transcripts.jsonl"), "").unwrap();

    // create temporary repo with script that triggers FileNotFoundError
    let temp_repo = tempdir().unwrap();
    let script_dir = temp_repo.path().join("src-tauri").join("python");
    fs::create_dir_all(&script_dir).unwrap();
    fs::write(
        script_dir.join("summarize_session.py"),
        "raise FileNotFoundError('no model')",
    )
    .unwrap();
    env::set_current_dir(temp_repo.path()).unwrap();

    // configure python path
    let py = which("python3").unwrap();
    save_paths(Some(py.to_string_lossy().to_string()), None, None)
        .await
        .unwrap();

    let app = mock_app();
    let handle = app.app_handle().clone();
    let err = summarize_session(handle, "sess".into()).await.unwrap_err();
    assert!(
        err.contains("model file not found — please download the .onnx model"),
        "unexpected error: {}",
        err
    );
}
