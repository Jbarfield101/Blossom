use std::{env, path::PathBuf};

use blossom_lib::commands::{bark_tts, save_paths};
use tempfile::tempdir;
use which::which;

#[tokio::test]
async fn bark_tts_reports_missing_python_and_script() {
    // isolate configuration
    let temp_home = tempdir().unwrap();
    env::set_var("HOME", temp_home.path());

    // ensure script exists for first check
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir.parent().unwrap();
    env::set_current_dir(&repo_root).unwrap();

    // case: python missing
    let missing = temp_home.path().join("no_python_here");
    env::set_var("BLOSSOM_PYTHON_PATH", missing.to_string_lossy().to_string());
    let err = bark_tts("hi".into(), "spk".into()).await.unwrap_err();
    assert!(err.contains("Python not found"));

    // case: script missing
    let py = which("python3").unwrap();
    save_paths(Some(py.to_string_lossy().to_string()), None)
        .await
        .unwrap();
    let temp_dir = tempdir().unwrap();
    env::set_current_dir(&temp_dir).unwrap();
    let err = bark_tts("hi".into(), "spk".into()).await.unwrap_err();
    assert!(err.contains("Script not found"));
}
