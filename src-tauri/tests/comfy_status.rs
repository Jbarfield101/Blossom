use blossom_lib::commands::{comfy_status, __has_comfy_child, __set_comfy_child};
use tokio::{process::Command, time::{sleep, Duration}};

#[tokio::test]
async fn comfy_status_clears_finished_process() {
    let child = Command::new("sh")
        .arg("-c")
        .arg("exit 0")
        .spawn()
        .expect("failed to spawn test process");

    __set_comfy_child(child);
    assert!(__has_comfy_child());

    sleep(Duration::from_millis(50)).await;
    assert!(!comfy_status().await.unwrap());
    assert!(!__has_comfy_child());
}
