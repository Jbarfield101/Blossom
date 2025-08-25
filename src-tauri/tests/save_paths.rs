use blossom_lib::commands::save_paths;
use serde_json::Value;
use std::{env, fs};

#[tokio::test]
async fn save_paths_writes_config() {
    let _rt = tauri::test::mock_runtime();
    let dir = tempfile::tempdir().unwrap();
    env::set_var("HOME", dir.path());

    save_paths(
        Some("python".into()),
        Some("comfy".into()),
        Some("model".into()),
        None,
        Some("speaker".into()),
        None,
    )
    .await
    .unwrap();

    let cfg_path = dir.path().join(".blossom").join("config.json");
    let data: Value = serde_json::from_str(&fs::read_to_string(cfg_path).unwrap()).unwrap();
    assert_eq!(data["python_path"], "python");
    assert_eq!(data["comfy_path"], "comfy");
    assert_eq!(data["tts_model_path"], "model");
    assert_eq!(data["tts_speaker"], "speaker");
}
