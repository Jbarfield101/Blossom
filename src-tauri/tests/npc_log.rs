use blossom_lib::commands::{append_npc_log, read_npc_log};
use serde_json::Value;
use tauri::{test::mock_app, Manager};

#[tokio::test]
async fn append_npc_log_includes_errors() {
    let _rt = <tauri::test::MockRuntime as tauri_runtime::Runtime<()>>::new(Default::default()).unwrap();
    let app = mock_app();
    let handle = app.app_handle().clone();

    append_npc_log(
        handle.clone(),
        "w".into(),
        "1".into(),
        "Bob".into(),
        None,
        None,
    )
    .await
    .unwrap();

    append_npc_log(
        handle.clone(),
        "w".into(),
        "".into(),
        "".into(),
        Some("E1".into()),
        Some("boom".into()),
    )
    .await
    .unwrap();

    let entries: Vec<Value> = read_npc_log(handle, None).await.unwrap();
    assert_eq!(entries.len(), 2);
    assert!(entries[0]["errorCode"].is_null());
    assert_eq!(entries[1]["errorCode"], "E1");
    assert_eq!(entries[1]["message"], "boom");
}
