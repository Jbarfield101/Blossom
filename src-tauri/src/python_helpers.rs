use std::{fs, path::PathBuf};

use dirs;
use serde::{Deserialize, Serialize};
use serde_json;
use which::which;

#[derive(Default, Serialize, Deserialize, Debug)]
pub struct AppConfig {
    pub python_path: Option<String>,
    pub comfy_path: Option<String>,
    pub sfz_convert_on_start: Option<bool>,
    pub sfz_out_dir: Option<String>,
}

fn config_path() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    let _ = fs::create_dir_all(&dir);
    dir.push("config.json");
    dir
}

fn load_config() -> AppConfig {
    let path = config_path();
    if let Ok(data) = fs::read_to_string(path) {
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

fn save_config(cfg: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let data = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

pub fn get_config() -> AppConfig {
    load_config()
}

#[tauri::command]
pub async fn load_paths() -> Result<AppConfig, String> {
    let path = resolve_python_path();
    let mut cfg = load_config();
    cfg.python_path = Some(path.to_string_lossy().to_string());
    Ok(cfg)
}

#[tauri::command]
pub async fn save_paths(
    python_path: Option<String>,
    comfy_path: Option<String>,
    sfz_out_dir: Option<String>,
) -> Result<(), String> {
    let mut cfg = load_config();
    if python_path.is_some() {
        cfg.python_path = python_path;
    }
    if comfy_path.is_some() {
        cfg.comfy_path = comfy_path;
    }
    if sfz_out_dir.is_some() {
        cfg.sfz_out_dir = sfz_out_dir;
    }
    save_config(&cfg)
}

#[tauri::command]
pub async fn set_sfz_convert_on_start(value: bool) -> Result<(), String> {
    let mut cfg = load_config();
    cfg.sfz_convert_on_start = Some(value);
    save_config(&cfg)
}

fn default_python() -> PathBuf {
    if cfg!(windows) {
        PathBuf::from("python.exe")
    } else {
        PathBuf::from("python3")
    }
}

fn detect_python_path() -> PathBuf {
    if let Ok(env_p) = std::env::var("BLOSSOM_PYTHON_PATH").or_else(|_| std::env::var("PYTHON")) {
        if !env_p.trim().is_empty() {
            return PathBuf::from(env_p);
        }
    }

    let candidates: &[&str] = if cfg!(windows) {
        &["python.exe", "python3.exe", "py.exe"]
    } else {
        &["python3", "python"]
    };

    for cand in candidates {
        if let Ok(found) = which(cand) {
            return found;
        }
    }

    default_python()
}

fn resolve_python_path() -> PathBuf {
    let mut cfg = load_config();

    if let Some(p) = &cfg.python_path {
        if !p.trim().is_empty() {
            return PathBuf::from(p);
        }
    }

    let path = detect_python_path();
    cfg.python_path = Some(path.to_string_lossy().to_string());
    let _ = save_config(&cfg);
    path
}

#[tauri::command]
pub async fn detect_python() -> Result<String, String> {
    Ok(detect_python_path().to_string_lossy().to_string())
}

pub fn conda_python() -> PathBuf {
    resolve_python_path()
}

pub fn conda_python_string() -> String {
    conda_python().to_string_lossy().to_string()
}
