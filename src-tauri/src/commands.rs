// src-tauri/src/commands.rs
use std::{
    env,
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Read, Write},
    path::{Path, PathBuf},
    process::{Command as PCommand, Stdio},
    sync::{Mutex, OnceLock},
    time::Duration,
};

use dirs;

use crate::stocks::{stocks_fetch as stocks_fetch_impl, StockBundle};
use crate::task_queue::{Task, TaskCommand, TaskQueue};
use chrono::{DateTime, Local, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use serde_yaml;
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, Window};
use tokio::{
    io::{AsyncBufReadExt, BufReader as TokioBufReader},
    process::Child,
    task::JoinHandle,
};
use which::which;

#[derive(Debug)]
struct LoggedChild {
    child: Child,
    tasks: Vec<JoinHandle<()>>,
}

impl LoggedChild {
    async fn wait(mut self) -> Result<std::process::ExitStatus, std::io::Error> {
        let status = self.child.wait().await?;
        for t in self.tasks {
            let _ = t.await;
        }
        Ok(status)
    }

    async fn kill(&mut self) -> Result<(), std::io::Error> {
        self.child.kill().await?;
        for t in self.tasks.drain(..) {
            t.abort();
        }
        Ok(())
    }
}

trait LogEmitter: Clone + Send + 'static {
    fn emit_event(&self, event: &str, payload: String);
}

impl<R: Runtime> LogEmitter for Window<R> {
    fn emit_event(&self, event: &str, payload: String) {
        let _ = Emitter::emit(self, event, payload);
    }
}

/* ==============================
ComfyUI launcher (no extra crate)
============================== */

static COMFY_CHILD: OnceLock<Mutex<Option<LoggedChild>>> = OnceLock::new();
static OLLAMA_CHILD: OnceLock<Mutex<Option<LoggedChild>>> = OnceLock::new();

pub fn __set_comfy_child(child: Child) {
    let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
    *lock = Some(LoggedChild { child, tasks: vec![] });
}

pub fn __has_comfy_child() -> bool {
    COMFY_CHILD
        .get_or_init(|| Mutex::new(None))
        .lock()
        .unwrap()
        .is_some()
}

// Reuse our python path from below
fn comfy_python() -> PathBuf {
    conda_python()
}

/// Spawn a command and forward its stdout and stderr to the frontend.
///
/// The command will have its standard streams piped and lines from both
/// streams will be emitted to the provided [`Window`] under `event_name`.
/// `stdout` lines are prefixed with `[out]` and `stderr` lines with `[err]`.
///
/// # Examples
///
/// ```no_run
/// use std::process::Command;
/// use tauri::Window;
/// # let window: Window<()> = unimplemented!();
/// let mut cmd = Command::new("echo");
/// cmd.arg("hello world");
/// let _child = spawn_with_logging(cmd, window, "echo_log").unwrap();
/// ```
fn spawn_with_logging<E: LogEmitter>(
    mut cmd: PCommand,
    emitter: E,
    event_name: &str,
) -> Result<LoggedChild, String> {
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = tokio::process::Command::from(cmd)
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();

    if let Some(out) = child.stdout.take() {
        let evt = event_name.to_string();
        let emit = emitter.clone();
        let handle = tokio::spawn(async move {
            let mut lines = TokioBufReader::new(out).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                emit.emit_event(&evt, format!("[out] {}", line));
            }
        });
        tasks.push(handle);
    }

    if let Some(err) = child.stderr.take() {
        let evt = event_name.to_string();
        let emit = emitter.clone();
        let handle = tokio::spawn(async move {
            let mut lines = TokioBufReader::new(err).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                emit.emit_event(&evt, format!("[err] {}", line));
            }
        });
        tasks.push(handle);
    }

    Ok(LoggedChild { child, tasks })
}

#[tauri::command]
pub async fn comfy_status() -> Result<bool, String> {
    let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
    if let Some(child) = lock.as_mut() {
        match child.child.try_wait() {
            Ok(Some(_)) => {
                *lock = None;
                Ok(false)
            }
            Ok(None) => Ok(true),
            Err(e) => {
                *lock = None;
                Err(e.to_string())
            }
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn comfy_start<R: Runtime>(window: Window<R>, dir: String) -> Result<(), String> {
    {
        let lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        if lock.is_some() {
            return Ok(()); // already running
        }
    }

    let dir = if dir.trim().is_empty() {
        let cfg = load_config();
        if let Some(p) = cfg.comfy_path {
            PathBuf::from(p)
        } else {
            default_comfy_path()
        }
    } else {
        PathBuf::from(dir)
    };
    if !dir.exists() {
        return Err(format!("ComfyUI folder not found at {}", dir.display()));
    }

    let py = comfy_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }

    let mut cmd = PCommand::new(&py);
    cmd.current_dir(&dir)
        .arg("main.py")
        .arg("--port")
        .arg("8188")
        .arg("--listen"); // remove if you only want localhost

    let child = spawn_with_logging(cmd, window, "comfy_log")
        .map_err(|e| format!("Failed to start ComfyUI: {e}"))?;

    {
        let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        *lock = Some(child);
    }

    Ok(())
}

#[tauri::command]
pub async fn comfy_stop() -> Result<(), String> {
    let child_opt = {
        let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        lock.take()
    };
    if let Some(mut child) = child_opt {
        let _ = child.kill().await;
    }
    Ok(())
}

/* ==============================
Python paths
============================== */

#[derive(Default, Serialize, Deserialize, Debug)]
pub struct AppConfig {
    pub python_path: Option<String>,
    pub comfy_path: Option<String>,
    pub alphavantage_api_key: Option<String>,
    pub tts_model_path: Option<String>,
    pub tts_config_path: Option<String>,
    pub tts_speaker: Option<String>,
    pub tts_language: Option<String>,
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

fn alphavantage_api_key() -> Option<String> {
    env::var("ALPHAVANTAGE_API_KEY")
        .ok()
        .or_else(|| load_config().alphavantage_api_key)
}

fn save_config(cfg: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let data = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
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
    tts_model_path: Option<String>,
    tts_config_path: Option<String>,
    tts_speaker: Option<String>,
    tts_language: Option<String>,
) -> Result<(), String> {
    let mut cfg = load_config();
    if python_path.is_some() {
        cfg.python_path = python_path;
    }
    if comfy_path.is_some() {
        cfg.comfy_path = comfy_path;
    }
    if tts_model_path.is_some() {
        cfg.tts_model_path = tts_model_path;
    }
    if tts_config_path.is_some() {
        cfg.tts_config_path = tts_config_path;
    }
    if tts_speaker.is_some() {
        cfg.tts_speaker = tts_speaker;
    }
    if tts_language.is_some() {
        cfg.tts_language = tts_language;
    }
    save_config(&cfg)
}

fn default_python() -> PathBuf {
    if cfg!(windows) {
        PathBuf::from("python.exe")
    } else {
        PathBuf::from("python3")
    }
}

/// Detect a python interpreter without consulting the user config.
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

/// Resolve the python interpreter path.
/// Priority: user setting -> env var -> PATH search -> default.
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

/// Absolute path to python. Falls back to system default if unset.
pub fn conda_python() -> PathBuf {
    resolve_python_path()
}

pub fn conda_python_string() -> String {
    conda_python().to_string_lossy().to_string()
}

fn default_comfy_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ComfyUI")
}

/// Resolve path to the HQ non-stream script (dev -> repo path; prod -> Resources).
fn script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd
            .join("src-tauri")
            .join("python")
            .join("lofi")
            .join("renderer.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("lofi")
        .join("renderer.py")
}

fn pdf_tools_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("pdf_tools.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("pdf_tools.py")
}

pub fn pdf_tools_path_default() -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("pdf_tools.py");
        if dev.exists() {
            return dev;
        }
    }
    PathBuf::from("pdf_tools.py")
}

pub fn pdf_tools_path_string() -> String {
    pdf_tools_path_default().to_string_lossy().to_string()
}

fn run_pdf_tool<R: Runtime>(app: &AppHandle<R>, args: &[&str]) -> Result<String, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = pdf_tools_path(app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let output = PCommand::new(&py)
        .arg(&script)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdfDoc {
    pub doc_id: String,
    pub title: Option<String>,
    pub pages: Option<u32>,
    pub created: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdfSearchHit {
    pub doc_id: String,
    pub page_range: [u32; 2],
    pub text: String,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpellRecord {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleRecord {
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub async fn parse_npc_pdf<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<Vec<Value>, String> {
    let out = run_pdf_tool(&app, &["npcs", &path])?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["npcs"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_add<R: Runtime>(app: AppHandle<R>, path: String) -> Result<Value, String> {
    let out = run_pdf_tool(&app, &["add", &path])?;
    serde_json::from_str(&out).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_remove<R: Runtime>(app: AppHandle<R>, doc_id: String) -> Result<(), String> {
    let _ = run_pdf_tool(&app, &["remove", &doc_id])?;
    Ok(())
}

#[tauri::command]
pub async fn pdf_list<R: Runtime>(app: AppHandle<R>) -> Result<Vec<PdfDoc>, String> {
    let out = run_pdf_tool(&app, &["list"])?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["documents"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_search<R: Runtime>(
    app: AppHandle<R>,
    query: String,
    k: Option<u32>,
) -> Result<Vec<PdfSearchHit>, String> {
    let mut args = vec!["search".to_string(), query];
    if let Some(k) = k {
        args.push("-k".into());
        args.push(k.to_string());
    }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = run_pdf_tool(&app, &arg_refs)?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["results"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_ingest<R: Runtime>(
    app: AppHandle<R>,
    queue: State<'_, TaskQueue>,
    doc_id: String,
) -> Result<u64, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = pdf_tools_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let cmd = TaskCommand::PdfIngest {
        py: py.to_string_lossy().to_string(),
        script: script.to_string_lossy().to_string(),
        doc_id: doc_id.clone(),
    };
    Ok(queue.enqueue(format!("pdf_ingest {doc_id}"), cmd).await)
}

#[tauri::command]
pub async fn parse_spell_pdf<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<Vec<SpellRecord>, String> {
    let out = run_pdf_tool(&app, &["spells", &path])?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["spells"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn parse_rule_pdf<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<Vec<RuleRecord>, String> {
    let out = run_pdf_tool(&app, &["rules", &path])?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["rules"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn parse_lore_pdf<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<Vec<Value>, String> {
    let out = run_pdf_tool(&app, &["lore", &path])?;
    let v: Value = serde_json::from_str(&out).map_err(|e| e.to_string())?;
    serde_json::from_value(v["lore"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn enqueue_parse_npc_pdf<R: Runtime>(
    app: AppHandle<R>,
    queue: State<'_, TaskQueue>,
    path: String,
    world: String,
) -> Result<u64, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = pdf_tools_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let cmd = TaskCommand::ParseNpcPdf {
        py: py.to_string_lossy().to_string(),
        script: script.to_string_lossy().to_string(),
        path,
        world,
    };
    Ok(queue.enqueue("Import NPC PDF".into(), cmd).await)
}

/* ==============================
Serde-mapped types (camelCase)
============================== */

#[derive(Debug, Deserialize, Serialize, Clone)] // allow cloning for nested use in SongSpec
#[serde(rename_all = "snake_case")]
pub struct Section {
    pub name: String,
    pub bars: u32,
    pub chords: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "snake_case")] // serialize to Python-friendly keys
pub struct SongSpec {
    #[serde(alias = "outDir")]
    pub out_dir: String,
    pub title: String,
    #[serde(alias = "album", skip_serializing_if = "Option::is_none")]
    pub album: Option<String>,
    pub bpm: u32,
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub form: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structure: Option<Vec<Section>>,
    pub mood: Vec<String>,
    pub instruments: Vec<String>,
    #[serde(alias = "leadInstrument", skip_serializing_if = "Option::is_none")]
    pub lead_instrument: Option<String>,
    pub ambience: Vec<String>,
    #[serde(alias = "ambienceLevel")]
    pub ambience_level: Option<f32>,
    pub seed: u64,
    pub variety: Option<u32>,
    #[serde(alias = "chordSpanBeats", skip_serializing_if = "Option::is_none")]
    pub chord_span_beats: Option<u32>,
    #[serde(alias = "drumPattern", skip_serializing_if = "Option::is_none")]
    pub drum_pattern: Option<String>,
    #[serde(alias = "hqStereo", skip_serializing_if = "Option::is_none")]
    pub hq_stereo: Option<bool>,
    #[serde(alias = "hqReverb", skip_serializing_if = "Option::is_none")]
    pub hq_reverb: Option<bool>,
    #[serde(alias = "hqSidechain", skip_serializing_if = "Option::is_none")]
    pub hq_sidechain: Option<bool>,
    #[serde(alias = "hqChorus", skip_serializing_if = "Option::is_none")]
    pub hq_chorus: Option<bool>,
    #[serde(alias = "limiterDrive", skip_serializing_if = "Option::is_none")]
    pub limiter_drive: Option<f32>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct AlbumRequest {
    pub track_count: u32,
    #[serde(alias = "title_base", skip_serializing_if = "Option::is_none")]
    pub title_base: Option<String>,
    #[serde(alias = "out_dir", skip_serializing_if = "Option::is_none")]
    pub out_dir: Option<String>,
    #[serde(alias = "album_name", skip_serializing_if = "Option::is_none")]
    pub album_name: Option<String>,
    #[serde(alias = "track_names", skip_serializing_if = "Option::is_none")]
    pub track_names: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specs: Option<Vec<SongSpec>>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TrackMeta {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct AlbumMeta {
    pub track_count: u32,
    pub album_dir: String,
    pub tracks: Vec<TrackMeta>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn song_spec_serializes_to_snake_case() {
        let spec = SongSpec {
            out_dir: "out".into(),
            title: "t".into(),
            album: None,
            bpm: 80,
            key: "C".into(),
            form: None,
            structure: None,
            mood: vec![],
            instruments: vec![],
            lead_instrument: None,
            ambience: vec![],
            ambience_level: Some(0.5),
            seed: 1,
            variety: Some(10),
            chord_span_beats: None,
            drum_pattern: None,
            hq_stereo: None,
            hq_reverb: None,
            hq_sidechain: None,
            hq_chorus: None,
            limiter_drive: None,
        };
        let v = serde_json::to_value(&spec).unwrap();
        assert!(v.get("ambience_level").is_some());
        assert!(v.get("out_dir").is_some());
        assert!(v.get("ambienceLevel").is_none());
    }

    #[test]
    fn parse_json_high_confidence() {
        let content = "{\"intent\":\"music\",\"confidence\":0.9}";
        assert_eq!(extract_intent(content), "music");
    }

    #[test]
    fn parse_json_low_confidence_defaults_to_chat() {
        let content = "{\"intent\":\"sys\",\"confidence\":0.4}";
        assert_eq!(extract_intent(content), "chat");
    }

    #[test]
    fn parse_plain_string() {
        assert_eq!(extract_intent("sys"), "sys");
    }

    #[tokio::test]
    async fn spawn_with_logging_cleans_up_tasks() {
        #[derive(Clone)]
        struct Dummy;
        impl LogEmitter for Dummy {
            fn emit_event(&self, _event: &str, _payload: String) {}
        }

        fn thread_count() -> usize {
            let status = std::fs::read_to_string("/proc/self/status").unwrap_or_default();
            status
                .lines()
                .find(|l| l.starts_with("Threads:"))
                .and_then(|l| l.split_whitespace().nth(1))
                .and_then(|s| s.parse().ok())
                .unwrap_or(0)
        }

        let before = thread_count();
        for _ in 0..5 {
            let mut cmd = PCommand::new("echo");
            cmd.arg("hi");
            let child = spawn_with_logging(cmd, Dummy, "test").unwrap();
            let _ = child.wait().await.unwrap();
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
        let after = thread_count();
        assert_eq!(before, after);
    }
}

/* ==============================
Audio commands
============================== */

/// Non-streaming generate. Enqueues a task and returns its ID.
#[tauri::command]
pub async fn lofi_generate_gpu<R: Runtime>(
    app: AppHandle<R>,
    queue: State<'_, TaskQueue>,
    prompt: String,
    duration: Option<u32>,
    seed: Option<u64>,
) -> Result<u64, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }

    let script = script_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }

    let dur = duration.unwrap_or(12);
    let seed = seed.unwrap_or(42);

    let cmd = TaskCommand::LofiGenerateGpu {
        py: py.to_string_lossy().to_string(),
        script: script.to_string_lossy().to_string(),
        prompt,
        duration: dur,
        seed,
    };
    Ok(queue.enqueue("lofi_generate_gpu".into(), cmd).await)
}

/// Run full-song generation based on a structured spec (typed, camelCase-friendly).
#[tauri::command]
pub async fn run_lofi_song<R: Runtime>(
    window: Window<R>,
    app: AppHandle<R>,
    spec: SongSpec,
) -> Result<String, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }

    let script = script_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let python_dir = script
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "invalid script path".to_string())?;

    // Ensure the output directory exists
    let out_dir = PathBuf::from(&spec.out_dir);
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    // Build outfile name
    let stamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("{} - {stamp}.wav", spec.title);
    let out_path = out_dir.join(file_name);

    // Serialize spec to JSON for Python
    let json_str = serde_json::to_string(&spec).map_err(|e| e.to_string())?;

    // Launch Python
    let mut cmd = PCommand::new(&py);
    cmd.current_dir(python_dir)
        .arg("-u")
        .arg("-m")
        .arg("lofi.renderer")
        .arg("--song-json")
        .arg(json_str)
        .arg("--out")
        .arg(&out_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    window
        .emit("lofi_progress", r#"{"stage":"start","message":"starting"}"#)
        .ok();

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    let mut stdout = BufReader::new(child.stdout.take().unwrap());
    let mut line = String::new();

    // Forward JSON status lines printed by Python to the UI
    loop {
        line.clear();
        let read = stdout.read_line(&mut line).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        let _ = window.emit("lofi_progress", line.trim().to_string());
    }

    // Gather stderr on failure
    let mut stderr_s = String::new();
    if let Some(mut e) = child.stderr.take() {
        let _ = e.read_to_string(&mut stderr_s);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("Python exited with {status}: {stderr_s}"));
    }

    window
        .emit("lofi_progress", r#"{"stage":"done","message":"saved"}"#)
        .ok();
    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate_album<R: Runtime>(
    window: Window<R>,
    app: AppHandle<R>,
    meta: AlbumRequest,
) -> Result<AlbumMeta, String> {
    let album_name = meta.album_name.unwrap_or_else(|| "album".to_string());
    let base_out = meta.out_dir.unwrap_or_else(|| ".".to_string());
    let album_dir = PathBuf::from(&base_out).join(&album_name);
    fs::create_dir_all(&album_dir).map_err(|e| e.to_string())?;

    let track_names = meta.track_names.unwrap_or_default();
    let specs = meta
        .specs
        .ok_or_else(|| "missing track specs".to_string())?;
    if specs.len() != track_names.len() {
        return Err("track names/specs length mismatch".into());
    }

    let mut tracks = Vec::new();
    for (name, mut spec) in track_names.into_iter().zip(specs.into_iter()) {
        spec.title = name.clone();
        spec.out_dir = album_dir.to_string_lossy().to_string();
        spec.album = Some(album_name.clone());
        let path = run_lofi_song(window.clone(), app.clone(), spec).await?;
        tracks.push(TrackMeta { name, path });
    }

    Ok(AlbumMeta {
        track_count: tracks.len() as u32,
        album_dir: album_dir.to_string_lossy().to_string(),
        tracks,
    })
}

#[tauri::command]
pub async fn cancel_album(_job_id: String) -> Result<(), String> {
    Ok(())
}

/* ==============================
Blender integration
============================== */

#[tauri::command]
pub async fn blender_run_script(code: String) -> Result<(), String> {
    let tmp = std::env::temp_dir().join("blossom_bpy_script.py");
    fs::write(&tmp, code).map_err(|e| e.to_string())?;

    let status = PCommand::new(blender_path())
        .arg("--background")
        .arg("--python")
        .arg(&tmp)
        .status()
        .map_err(|e| format!("failed to run blender: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("blender exited with status {status}"))
    }
}

fn blender_path() -> PathBuf {
    PathBuf::from("blender")
}

/* ==============================
Rule storage
============================== */

fn rule_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("dnd")
        .join("rules");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn validate_rule(rule: &Value) -> Result<Value, String> {
    let script = PathBuf::from("scripts").join("validate-dnd.ts");
    let json = serde_json::to_string(rule).map_err(|e| e.to_string())?;
    let output = PCommand::new("npx")
        .arg("tsx")
        .arg(&script)
        .arg("rule")
        .arg(&json)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| e.to_string())
}

fn update_rule_index<R: Runtime>(app: &AppHandle<R>, entry: &Value) -> Result<(), String> {
    let dir = rule_storage_dir(app)?;
    let index_path = dir.join("index.json");
    let mut entries: Vec<Value> = if index_path.exists() {
        let contents = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&contents).map_err(|e| e.to_string())?
    } else {
        Vec::new()
    };
    entries.retain(|e| e["id"] != entry["id"]);
    entries.push(entry.clone());
    let json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
    fs::write(index_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_rule<R: Runtime>(
    app: AppHandle<R>,
    rule: Value,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let validated = validate_rule(&rule)?;
    let id = validated["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = rule_storage_dir(&app)?;
    let path = dir.join(format!("{id}.md"));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let mut front = validated.clone();
    let body = front
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    front.as_object_mut().map(|o| o.remove("description"));
    if let (Some(orig), Some(valid)) = (rule.as_object(), validated.as_object()) {
        let mut sections = serde_json::Map::new();
        for (k, v) in orig {
            if !valid.contains_key(k) {
                sections.insert(k.clone(), v.clone());
            }
        }
        if !sections.is_empty() {
            front
                .as_object_mut()
                .map(|o| o.insert("sections".into(), Value::Object(sections)));
        }
    }
    front
        .as_object_mut()
        .map(|o| o.insert("type".into(), Value::String("rule".into())));
    let yaml = serde_yaml::to_string(&front).map_err(|e| e.to_string())?;
    let md = format!("---\n{yaml}---\n{body}\n");
    fs::write(&path, md).map_err(|e| e.to_string())?;
    let index_entry = serde_json::json!({
        "id": id,
        "name": validated["name"].clone(),
        "tags": validated["tags"].clone(),
        "path": format!("dnd/rules/{id}.md"),
    });
    update_rule_index(&app, &index_entry)?;
    Ok(())
}

#[tauri::command]
pub async fn list_rules<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Value>, String> {
    let dir = rule_storage_dir(&app)?;
    let index_path = dir.join("index.json");
    if !index_path.exists() {
        return Ok(Vec::new());
    }
    let contents = fs::read_to_string(index_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

/* ==============================
Spell storage
============================== */

fn spell_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("dnd")
        .join("spells");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn validate_spell(spell: &Value) -> Result<Value, String> {
    let script = PathBuf::from("scripts").join("validate-dnd.ts");
    let json = serde_json::to_string(spell).map_err(|e| e.to_string())?;
    let output = PCommand::new("npx")
        .arg("tsx")
        .arg(&script)
        .arg("spell")
        .arg(&json)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| e.to_string())
}

fn update_spell_index<R: Runtime>(app: &AppHandle<R>, entry: &Value) -> Result<(), String> {
    let dir = spell_storage_dir(app)?;
    let index_path = dir.join("index.json");
    let mut entries: Vec<Value> = if index_path.exists() {
        let contents = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&contents).map_err(|e| e.to_string())?
    } else {
        Vec::new()
    };
    entries.retain(|e| e["id"] != entry["id"]);
    entries.push(entry.clone());
    let json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
    fs::write(index_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_spell<R: Runtime>(
    app: AppHandle<R>,
    spell: Value,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let validated = validate_spell(&spell)?;
    let id = validated["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = spell_storage_dir(&app)?;
    let path = dir.join(format!("{id}.md"));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let mut front = validated.clone();
    let body = front
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    front.as_object_mut().map(|o| o.remove("description"));
    front
        .as_object_mut()
        .map(|o| o.insert("type".into(), Value::String("spell".into())));
    let yaml = serde_yaml::to_string(&front).map_err(|e| e.to_string())?;
    let md = format!("---\n{yaml}---\n{body}\n");
    fs::write(&path, md).map_err(|e| e.to_string())?;
    let index_entry = serde_json::json!({
        "id": id,
        "name": validated["name"].clone(),
        "level": validated["level"].clone(),
        "school": validated["school"].clone(),
        "path": format!("dnd/spells/{id}.md"),
    });
    update_spell_index(&app, &index_entry)?;
    Ok(())
}

#[tauri::command]
pub async fn list_spells<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Value>, String> {
    let dir = spell_storage_dir(&app)?;
    let index_path = dir.join("index.json");
    if !index_path.exists() {
        return Ok(Vec::new());
    }
    let contents = fs::read_to_string(index_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

/* ==============================
Lore storage
============================== */

fn lore_storage_dir<R: Runtime>(app: &AppHandle<R>, world: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("worlds")
        .join(world)
        .join("lore");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn validate_lore(lore: &Value) -> Result<Value, String> {
    let script = PathBuf::from("scripts").join("validate-dnd.ts");
    let json = serde_json::to_string(lore).map_err(|e| e.to_string())?;
    let output = PCommand::new("npx")
        .arg("tsx")
        .arg(&script)
        .arg("lore")
        .arg(&json)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| e.to_string())
}

fn update_lore_index<R: Runtime>(app: &AppHandle<R>, world: &str) -> Result<(), String> {
    let dir = lore_storage_dir(app, world)?;
    let mut entries = Vec::new();
    if dir.exists() {
        let iter = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in iter {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.file_name() == Some(std::ffi::OsStr::new("index.json")) {
                continue;
            }
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
                entries.push(serde_json::json!({
                    "id": data["id"].clone(),
                    "name": data["name"].clone(),
                    "tags": data["tags"].clone(),
                    "path": path.to_string_lossy().to_string(),
                }));
            }
        }
    }
    let index_path = dir.join("index.json");
    let json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
    fs::write(index_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_lore<R: Runtime>(
    app: AppHandle<R>,
    world: String,
    lore: Value,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let validated = validate_lore(&lore)?;
    let id = validated["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = lore_storage_dir(&app, &world)?;
    let path = dir.join(format!("{}.json", &id));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let json = serde_json::to_string_pretty(&validated).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    update_lore_index(&app, &world)?;
    Ok(())
}

#[tauri::command]
pub async fn list_lore<R: Runtime>(app: AppHandle<R>, world: String) -> Result<Vec<Value>, String> {
    let dir = lore_storage_dir(&app, &world)?;
    let mut lore = Vec::new();
    if dir.exists() {
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
                lore.push(data);
            }
        }
    }
    Ok(lore)
}

/* ==============================
NPC storage
============================== */

fn npc_storage_dir<R: Runtime>(app: &AppHandle<R>, world: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("worlds")
        .join(world)
        .join("npcs");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn validate_npc(npc: &Value) -> Result<Value, String> {
    let script = PathBuf::from("scripts").join("validate-dnd.ts");
    let json = serde_json::to_string(npc).map_err(|e| e.to_string())?;
    let output = PCommand::new("npx")
        .arg("tsx")
        .arg(&script)
        .arg("npc")
        .arg(&json)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| e.to_string())
}

fn create_placeholder_image(path: &Path, width: u32, height: u32) -> Result<(), String> {
    use std::fs::File;
    use std::io::BufWriter;
    let buffer = vec![0u8; (width * height * 4) as usize];
    let file = File::create(path).map_err(|e| e.to_string())?;
    let w = BufWriter::new(file);
    let mut encoder = png::Encoder::new(w, width, height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_pixel_dims(Some(png::PixelDimensions {
        xppu: 11811,
        yppu: 11811,
        unit: png::Unit::Meter,
    }));
    let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
    writer.write_image_data(&buffer).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_npc<R: Runtime>(
    app: AppHandle<R>,
    world: String,
    npc: Value,
    overwrite: Option<bool>,
) -> Result<Value, String> {
    let mut validated = validate_npc(&npc)?;
    let id = validated["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?
        .to_string();
    let dir = npc_storage_dir(&app, &world)?;
    let path = dir.join(format!("{}.json", id));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let portraits = dir.join("portraits");
    fs::create_dir_all(&portraits).map_err(|e| e.to_string())?;
    let icons = dir.join("icons");
    fs::create_dir_all(&icons).map_err(|e| e.to_string())?;
    if validated
        .get("portrait")
        .and_then(|v| v.as_str())
        .map_or(true, |s| s.is_empty() || s == "placeholder.png")
    {
        let p = portraits.join(format!("{}.png", &id));
        create_placeholder_image(&p, 900, 1200)?;
        validated["portrait"] = Value::String(p.to_string_lossy().into());
    }
    if validated
        .get("icon")
        .and_then(|v| v.as_str())
        .map_or(true, |s| s.is_empty() || s == "placeholder-icon.png")
    {
        let i = icons.join(format!("{}.png", &id));
        create_placeholder_image(&i, 300, 300)?;
        validated["icon"] = Value::String(i.to_string_lossy().into());
    }
    let json = serde_json::to_string_pretty(&validated).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(validated)
}

#[tauri::command]
pub async fn list_npcs<R: Runtime>(app: AppHandle<R>, world: String) -> Result<Vec<Value>, String> {
    let dir = npc_storage_dir(&app, &world)?;
    let mut npcs = Vec::new();
    if dir.exists() {
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
                npcs.push(data);
            }
        }
    }
    Ok(npcs)
}

#[tauri::command]
pub async fn append_npc_log<R: Runtime>(
    app: AppHandle<R>,
    world: String,
    id: String,
    name: String,
) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("npc")
        .join("log");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("npc-import.log");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    let entry = json!({
        "timestamp": Utc::now().to_rfc3339(),
        "world": world,
        "id": id,
        "name": name,
    });
    writeln!(file, "{}", entry.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn read_npc_log<R: Runtime>(
    app: AppHandle<R>,
    limit: Option<usize>,
) -> Result<Vec<Value>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("npc")
        .join("log");
    let path = dir.join("npc-import.log");
    let file = match fs::File::open(&path) {
        Ok(f) => f,
        Err(_) => return Ok(vec![]),
    };
    let reader = BufReader::new(file);
    let mut entries: Vec<Value> = reader
        .lines()
        .filter_map(|l| l.ok())
        .filter_map(|l| serde_json::from_str(&l).ok())
        .collect();
    if let Some(lim) = limit {
        if entries.len() > lim {
            entries = entries[entries.len() - lim..].to_vec();
        }
    }
    Ok(entries)
}

/* ==============================
Ollama general chat
============================== */

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

fn models_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("ollama-models");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn start_ollama<R: Runtime>(app: AppHandle<R>, window: Window<R>) -> Result<(), String> {
    let client = reqwest::Client::new();
    // check if already running
    if client
        .get("http://127.0.0.1:11434/")
        .timeout(std::time::Duration::from_millis(500))
        .send()
        .await
        .is_ok()
    {
        return Ok(());
    }

    let dir = models_dir(&app)?;

    // spawn serve
    let mut cmd = PCommand::new("ollama");
    cmd.arg("serve")
        .env("OLLAMA_MODELS", &dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let child = tokio::process::Command::from(cmd)
        .spawn()
        .map_err(|e| format!("failed to start ollama: {e}"))?;
    {
        let mut lock = OLLAMA_CHILD
            .get_or_init(|| Mutex::new(None))
            .lock()
            .unwrap();
        *lock = Some(LoggedChild {
            child,
            tasks: vec![],
        });
    }

    // wait for server
    for _ in 0..20 {
        if client
            .get("http://127.0.0.1:11434/")
            .timeout(std::time::Duration::from_millis(500))
            .send()
            .await
            .is_ok()
        {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    if client
        .get("http://127.0.0.1:11434/")
        .timeout(std::time::Duration::from_millis(500))
        .send()
        .await
        .is_err()
    {
        return Err("Ollama did not start".into());
    }

    // check model
    let resp = client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    let has = json["models"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .any(|m| m["name"].as_str() == Some("gpt-oss:20b"))
        })
        .unwrap_or(false);

    if !has {
        let mut pull = PCommand::new("ollama");
        pull.arg("pull")
            .arg("gpt-oss:20b")
            .env("OLLAMA_MODELS", &dir);
        let child = spawn_with_logging(pull, window, "ollama_log")
            .map_err(|e| format!("ollama pull failed: {e}"))?;
        let status = child.wait().await.map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("ollama pull failed".into());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_ollama() -> Result<(), String> {
    let child_opt = {
        let mut lock = OLLAMA_CHILD
            .get_or_init(|| Mutex::new(None))
            .lock()
            .unwrap();
        lock.take()
    };
    if let Some(mut child) = child_opt {
        let _ = child.kill().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn general_chat<R: Runtime>(
    app: AppHandle<R>,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let mut msgs = messages.clone();
    let query = messages
        .last()
        .map(|m| m.content.clone())
        .unwrap_or_default();
    if !query.is_empty() {
        if let Ok(results) = pdf_search(app.clone(), query, None).await {
            if !results.is_empty() {
                let mut ctx = String::from("Relevant documents:\n");
                for r in &results {
                    ctx.push_str(&format!(
                        "- {} p.{}-{}: {}\n",
                        r.doc_id, r.page_range[0], r.page_range[1], r.text
                    ));
                }
                msgs.push(ChatMessage {
                    role: "system".into(),
                    content: ctx,
                });
            }
        }
    }
    let client = reqwest::Client::new();
    let resp = client
        .post("http://127.0.0.1:11434/api/chat")
        .json(&serde_json::json!({
          "model": "gpt-oss:20b",
          "stream": false,
          "messages": msgs,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = json["message"]["content"]
        .as_str()
        .or_else(|| json["content"].as_str())
        .ok_or("no content")?;
    Ok(content.to_string())
}

#[tauri::command]
pub async fn detect_intent(query: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("http://127.0.0.1:11434/api/chat")
        .json(&serde_json::json!({
            "model": "gpt-oss:20b",
            "stream": false,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an intent classifier. Reply in JSON with fields intent and confidence (0-1). intent must be sys for system information, music for music generation, or chat for anything else. Examples: 'can you show system stats?' -> {\"intent\":\"sys\",\"confidence\":1}. 'generate a chill song with three tracks' -> {\"intent\":\"music\",\"confidence\":1}.",
                },
                { "role": "user", "content": query },
            ],
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = json["message"]["content"]
        .as_str()
        .or_else(|| json["content"].as_str())
        .unwrap_or("chat");
    Ok(extract_intent(content))
}

fn extract_intent(content: &str) -> String {
    let trimmed = content.trim();
    if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
        let intent = v["intent"].as_str().unwrap_or("chat");
        let confidence = v["confidence"].as_f64().unwrap_or(0.0);
        if confidence < 0.5 {
            return "chat".to_string();
        }
        return match intent {
            "sys" => "sys".to_string(),
            "music" => "music".to_string(),
            _ => "chat".to_string(),
        };
    }
    match trimmed.to_lowercase().as_str() {
        "sys" => "sys".to_string(),
        "music" => "music".to_string(),
        _ => "chat".to_string(),
    }
}

#[tauri::command]
pub async fn stocks_fetch<R: Runtime>(
    app: AppHandle<R>,
    tickers: Vec<String>,
    range: String,
) -> Result<StockBundle, String> {
    stocks_fetch_impl(app, tickers, range).await
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StockForecast {
    pub short_term: String,
    pub long_term: String,
}

#[tauri::command]
pub async fn stock_forecast<R: Runtime>(
    app: AppHandle<R>,
    symbol: String,
) -> Result<StockForecast, String> {
    let sym = symbol.to_uppercase();

    // recent 5 day series
    let recent_url =
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=5d&interval=1d");
    let recent_resp = reqwest::get(&recent_url).await.map_err(|e| e.to_string())?;
    let recent_json: Value = recent_resp.json().await.map_err(|e| e.to_string())?;
    let result = recent_json["chart"]["result"]
        .get(0)
        .ok_or_else(|| "chart result missing".to_string())?;
    let timestamps = result["timestamp"].as_array().ok_or("timestamps missing")?;
    let closes = result["indicators"]["quote"]
        .get(0)
        .and_then(|q| q["close"].as_array())
        .ok_or("closes missing")?;
    let mut recent_parts = Vec::new();
    for (ts, close) in timestamps.iter().zip(closes.iter()) {
        if let (Some(ts), Some(price)) = (ts.as_i64(), close.as_f64()) {
            if let Some(dt) = DateTime::<Utc>::from_timestamp(ts, 0) {
                let date = dt.format("%Y-%m-%d").to_string();
                recent_parts.push(format!("{date}: {:.2}", price));
            }
        }
    }
    let recent_summary = recent_parts.join(", ");

    // 6 month series (weekly)
    let long_url =
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=6mo&interval=1wk");
    let long_resp = reqwest::get(&long_url).await.map_err(|e| e.to_string())?;
    let long_json: Value = long_resp.json().await.map_err(|e| e.to_string())?;
    let result = long_json["chart"]["result"]
        .get(0)
        .ok_or_else(|| "chart result missing".to_string())?;
    let timestamps = result["timestamp"].as_array().ok_or("timestamps missing")?;
    let closes = result["indicators"]["quote"]
        .get(0)
        .and_then(|q| q["close"].as_array())
        .ok_or("closes missing")?;
    let mut long_parts = Vec::new();
    for (ts, close) in timestamps.iter().zip(closes.iter()) {
        if let (Some(ts), Some(price)) = (ts.as_i64(), close.as_f64()) {
            if let Some(dt) = DateTime::<Utc>::from_timestamp(ts, 0) {
                let date = dt.format("%Y-%m-%d").to_string();
                long_parts.push(format!("{date}: {:.2}", price));
            }
        }
    }
    let long_summary = long_parts.join(", ");

    // news headlines
    let articles = fetch_stock_news(sym.clone())
        .await
        .unwrap_or_else(|_| vec![]);
    let news_summary = if articles.is_empty() {
        String::from("No major news")
    } else {
        articles
            .iter()
            .take(3)
            .map(|a| a.title.clone())
            .collect::<Vec<_>>()
            .join("; ")
    };

    let prompt = format!(
        "Recent closing prices for {sym} (5d): {recent_summary}. Six month trend: {long_summary}. News: {news_summary}. Provide a short-term (next week) and long-term (next quarter or year) forecast for {sym}. Respond in JSON with keys shortTerm and longTerm."
    );

    let reply = general_chat(
        app,
        vec![ChatMessage {
            role: "user".into(),
            content: prompt,
        }],
    )
    .await?;

    let forecast: StockForecast = serde_json::from_str(&reply).unwrap_or(StockForecast {
        short_term: reply.clone(),
        long_term: String::new(),
    });
    Ok(forecast)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewsArticle {
    pub title: String,
    pub link: String,
    pub timestamp: i64,
    pub summary: String,
}

#[tauri::command]
pub async fn fetch_stock_news(symbol: String) -> Result<Vec<NewsArticle>, String> {
    let sym = symbol.to_uppercase();
    let api_key = alphavantage_api_key().ok_or("AlphaVantage API key not set")?;
    let url = format!(
        "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={sym}&apikey={api_key}"
    );
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    let items = json["feed"].as_array().ok_or("feed missing")?;
    let mut out = Vec::new();
    for item in items {
        let title = item["title"].as_str().unwrap_or("").to_string();
        let link = item["url"].as_str().unwrap_or("").to_string();
        let summary = item["summary"].as_str().unwrap_or("").to_string();
        let ts = item["time_published"].as_str().unwrap_or("");
        let timestamp = NaiveDateTime::parse_from_str(ts, "%Y%m%dT%H%M%S")
            .map(|dt| dt.and_utc().timestamp())
            .unwrap_or(0);
        if !title.is_empty() && !link.is_empty() {
            out.push(NewsArticle {
                title,
                link,
                timestamp,
                summary,
            });
        }
    }
    Ok(out)
}

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

/* ==============================
Transcription
============================== */

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptEntry {
    pub id: String,
    pub audio_path: String,
    pub text: String,
    pub created_at: String,
}

fn transcripts_path() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    let _ = fs::create_dir_all(&dir);
    dir.push("transcripts.json");
    dir
}

fn transcripts_audio_dir() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    dir.push("transcripts");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn transcribe_script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("transcribe.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("transcribe.py")
}

fn dj_mix_script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("dj_mix.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("dj_mix.py")
}

fn run_transcribe_script<R: Runtime>(app: &AppHandle<R>, audio: &Path) -> Result<String, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = transcribe_script_path(app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let output = PCommand::new(&py)
        .arg(&script)
        .arg(audio)
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn save_transcripts(entries: &[TranscriptEntry]) -> Result<(), String> {
    let path = transcripts_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let data = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_transcripts() -> Result<Vec<TranscriptEntry>, String> {
    let path = transcripts_path();
    if let Ok(data) = fs::read_to_string(path) {
        serde_json::from_str(&data).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn transcribe_audio<R: Runtime>(
    app: AppHandle<R>,
    data: Vec<u8>,
) -> Result<String, String> {
    if data.is_empty() {
        return Err("no audio data provided".into());
    }
    let id = chrono::Local::now().timestamp_millis().to_string();
    let audio_dir = transcripts_audio_dir();
    let audio_path = audio_dir.join(format!("{id}.wav"));
    fs::write(&audio_path, &data).map_err(|e| e.to_string())?;
    let text = run_transcribe_script(&app, &audio_path)?.trim().to_string();

    let mut entries = load_transcripts().await.unwrap_or_else(|_| vec![]);
    entries.push(TranscriptEntry {
        id: id.clone(),
        audio_path: audio_path.to_string_lossy().to_string(),
        text: text.clone(),
        created_at: chrono::Local::now().to_rfc3339(),
    });
    save_transcripts(&entries)?;

    Ok(text)
}

#[tauri::command]
pub async fn dj_mix<R: Runtime>(
    app: AppHandle<R>,
    specs: Vec<String>,
    out: String,
    host: bool,
    tts_model_path: Option<String>,
    tts_config: Option<String>,
    tts_speaker: Option<String>,
    tts_language: Option<String>,
) -> Result<(), String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = dj_mix_script_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let mut cmd = PCommand::new(py);
    cmd.arg(&script)
        .arg("--specs")
        .args(&specs)
        .arg("--out")
        .arg(&out);
    if host {
        cmd.arg("--host");
    }
    if let Some(p) = tts_model_path {
        cmd.arg("--tts-model-path").arg(p);
    }
    if let Some(p) = tts_config {
        cmd.arg("--tts-config").arg(p);
    }
    if let Some(p) = tts_speaker {
        cmd.arg("--tts-speaker").arg(p);
    }
    if let Some(p) = tts_language {
        cmd.arg("--tts-language").arg(p);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn generate_ambience<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = script_path(&app);
    let py_dir = script
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "Script path not found".to_string())?;
    let output = PCommand::new(&py)
        .arg("-m")
        .arg("ambience_generator")
        .current_dir(&py_dir)
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;

    if let Some(window) = app.get_webview_window("main") {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let _ = window.emit("ambience_log", format!("[out] {}", line));
        }
        for line in String::from_utf8_lossy(&output.stderr).lines() {
            let _ = window.emit("ambience_log", format!("[err] {}", line));
        }
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "ambience_generator exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(())
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub mem_usage: f32,
    pub gpu_usage: Option<f32>,
}

#[tauri::command]
pub async fn system_info() -> Result<SystemInfo, String> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    std::thread::sleep(Duration::from_millis(100));
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    let cpu_usage = sys.global_cpu_usage();
    let mem_usage = if sys.total_memory() > 0 {
        (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0
    } else {
        0.0
    };

    let gpu_usage = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=utilization.gpu",
            "--format=csv,noheader,nounits",
        ])
        .output()
        .ok()
        .and_then(|o| {
            String::from_utf8(o.stdout)
                .ok()
                .and_then(|s| s.trim().parse::<f32>().ok())
        });

    Ok(SystemInfo {
        cpu_usage,
        mem_usage,
        gpu_usage,
    })
}

/* ==============================
Task queue commands
============================== */

#[tauri::command]
pub async fn enqueue_task(
    queue: State<'_, TaskQueue>,
    label: String,
    command: TaskCommand,
) -> Result<u64, String> {
    Ok(queue.enqueue(label, command).await)
}

#[tauri::command]
pub async fn task_status(queue: State<'_, TaskQueue>, id: u64) -> Result<Option<Task>, String> {
    Ok(queue.get(id).await)
}

#[tauri::command]
pub async fn cancel_task(queue: State<'_, TaskQueue>, id: u64) -> Result<bool, String> {
    Ok(queue.cancel(id).await)
}

#[tauri::command]
pub async fn list_tasks(queue: State<'_, TaskQueue>) -> Result<Vec<Task>, String> {
    Ok(queue.list().await)
}

#[tauri::command]
pub async fn set_task_limits(
    queue: State<'_, TaskQueue>,
    cpu: f32,
    memory: f32,
) -> Result<(), String> {
    queue.set_limits(cpu, memory).await;
    Ok(())
}
