use blossom_lib::commands::{load_paths, save_paths};
use serde_json::Value;
use std::{env, fs};

#[tokio::test]
async fn save_paths_writes_config() {
    let _rt =
        <tauri::test::MockRuntime as tauri_runtime::Runtime<()>>::new(Default::default()).unwrap();
    let dir = tempfile::tempdir().unwrap();
    env::set_var("HOME", dir.path());

    save_paths(
        Some("python".into()),
        Some("comfy".into()),
        Some("out".into()),
    )
    .await
    .unwrap();

    let cfg_path = dir.path().join(".blossom").join("config.json");
    let data: Value = serde_json::from_str(&fs::read_to_string(cfg_path).unwrap()).unwrap();
    assert_eq!(data["python_path"], "python");
    assert_eq!(data["comfy_path"], "comfy");
    assert_eq!(data["sfz_out_dir"], "out");

    let cfg = load_paths().await.unwrap();
    assert_eq!(cfg.sfz_out_dir.as_deref(), Some("out"));
}
