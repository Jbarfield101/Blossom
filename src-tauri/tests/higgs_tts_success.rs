use std::{env, fs};

use blossom_lib::commands::higgs_tts;
use tauri::{test::mock_app, Manager};
use tempfile::tempdir;
use which::which;

const WAV_BYTES: &[u8] = b"RIFF\x26\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x80>\x00\x00\x02\x00\x10\x00data\x02\x00\x00\x00\x00\x00";

#[tokio::test]
async fn higgs_tts_produces_expected_audio() {
    let orig_home = env::var("HOME").ok();
    let orig_python = env::var("BLOSSOM_PYTHON_PATH").ok();
    let orig_dir = env::current_dir().unwrap();

    let temp_home = tempdir().unwrap();
    env::set_var("HOME", temp_home.path());

    let repo = tempdir().unwrap();
    let script_dir = repo.path().join("src-tauri").join("python");
    fs::create_dir_all(&script_dir).unwrap();
    fs::write(
        script_dir.join("higgs_tts.py"),
        r#"
import argparse, sys
parser = argparse.ArgumentParser()
parser.add_argument("--text")
parser.add_argument("--speaker")
parser.parse_args()
sys.stdout.buffer.write(b"RIFF\x26\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x80>\x00\x00\x02\x00\x10\x00data\x02\x00\x00\x00\x00\x00")
"#,
    )
    .unwrap();

    env::set_var("BLOSSOM_PYTHON_PATH", which("python3").unwrap());
    env::set_current_dir(&repo).unwrap();

    let app = mock_app();
    let handle = app.app_handle().clone();
    let output = higgs_tts(handle, "hi".into(), "spk".into()).await.unwrap();
    assert_eq!(output, WAV_BYTES);

    env::set_current_dir(orig_dir).unwrap();
    if let Some(v) = orig_home {
        env::set_var("HOME", v);
    } else {
        env::remove_var("HOME");
    }
    if let Some(v) = orig_python {
        env::set_var("BLOSSOM_PYTHON_PATH", v);
    } else {
        env::remove_var("BLOSSOM_PYTHON_PATH");
    }
}
