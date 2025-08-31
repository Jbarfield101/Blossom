use blossom_lib::commands::sfz_convert_flac_to_wav;
use std::env;

#[tokio::test]
async fn sfz_convert_flac_to_wav_errors_if_npx_missing() {
    let original_path = env::var("PATH").unwrap_or_default();
    env::set_var("PATH", "");
    let result = sfz_convert_flac_to_wav(None, None).await;
    env::set_var("PATH", original_path);
    assert!(result.unwrap_err().contains("npx not found"));
}
