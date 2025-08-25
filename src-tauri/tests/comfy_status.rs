use blossom_lib::commands::{comfy_status, __has_comfy_child, __set_comfy_child};

#[tokio::test]
async fn comfy_status_clears_finished_process() {
    let _rt = tauri::test::mock_runtime();

    let child = std::process::Command::new("sh")
        .arg("-c")
        .arg("exit 0")
        .spawn()
        .expect("failed to spawn test process");

    __set_comfy_child(child);
    assert!(__has_comfy_child());

    assert!(!comfy_status().await.unwrap());
    assert!(!__has_comfy_child());
}
