use std::{
    fs,
    path::{Path, PathBuf},
    process::Command as PCommand,
};

use base64::{engine::general_purpose, Engine as _};
use dirs;
use serde::{Deserialize, Serialize};
use serde_json;
use tauri::State;

use crate::task_queue::{TaskCommand, TaskQueue};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ShortSpec {
    pub id: String,
    pub title: String,
    pub script: String,
    pub audio_path: Option<String>,
    pub visual_path: Option<String>,
    pub export_path: Option<String>,
    pub status: String,
    pub created_at: String,
}

fn shorts_path() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    let _ = fs::create_dir_all(&dir);
    dir.push("shorts.json");
    dir
}

#[tauri::command]
pub async fn load_shorts() -> Result<Vec<ShortSpec>, String> {
    let path = shorts_path();
    if let Ok(data) = fs::read_to_string(path) {
        serde_json::from_str(&data).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn save_shorts(specs: Vec<ShortSpec>) -> Result<(), String> {
    let path = shorts_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let data = serde_json::to_string_pretty(&specs).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_short(queue: State<'_, TaskQueue>, spec: ShortSpec) -> Result<u64, String> {
    let label = format!("generate_short {}", spec.id);
    let cmd = TaskCommand::GenerateShort { spec };
    Ok(queue.enqueue(label, cmd).await)
}

fn retro_tv_dir() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    let _ = fs::create_dir_all(&dir);
    dir
}

#[tauri::command]
pub async fn save_retro_tv_video(data: String, ext: String) -> Result<String, String> {
    let dir = retro_tv_dir();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .map_or(false, |n| n.starts_with("retro_tv."))
            {
                let _ = fs::remove_file(path);
            }
        }
    }
    let path = dir.join(format!("retro_tv.{ext}"));
    let b64 = data.split(',').last().unwrap_or_default();
    let bytes = general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| e.to_string())?;
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn loop_video(
    input: String,
    output_dir: String,
    output_name: String,
    hours: u64,
    minutes: u64,
    seconds: u64,
) -> Result<String, String> {
    let duration = hours * 3600 + minutes * 60 + seconds;
    if duration == 0 {
        return Err("duration must be greater than zero".into());
    }
    let out_path = Path::new(&output_dir).join(format!("{}.mp4", output_name));
    let status = PCommand::new("ffmpeg")
        .arg("-y")
        .arg("-stream_loop")
        .arg("-1")
        .arg("-i")
        .arg(&input)
        .arg("-c")
        .arg("copy")
        .arg("-t")
        .arg(duration.to_string())
        .arg(&out_path)
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("ffmpeg exited with status {}", status));
    }
    Ok(out_path.to_string_lossy().to_string())
}
