use std::{env, path::Path};

#[tokio::test]
async fn sfz_resolve_and_serve() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let path = Path::new(&manifest_dir)
        .join("target/debug/sfz_sounds/UprightPianoKW-20220221.sfz");
    assert!(path.exists());

    let url = format!("http://asset.localhost/{}", path.to_string_lossy());
    if let Ok(resp) = reqwest::get(url).await {
        assert_eq!(resp.status(), reqwest::StatusCode::OK);
    } else {
        eprintln!("asset server not running");
    }
}
