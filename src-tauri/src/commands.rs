// src-tauri/src/commands.rs
use std::{
    fs,
    io::{BufRead, BufReader, Read},
    path::PathBuf,
    process::{Child, Command as PCommand, Stdio},
    sync::{Mutex, OnceLock},
};

use dirs;

use crate::stocks::{stocks_fetch as stocks_fetch_impl, StockBundle};
use chrono::{Local, NaiveDateTime};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};
use which::which;

/* ==============================
ComfyUI launcher (no extra crate)
============================== */

static COMFY_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static OLLAMA_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

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
/// let _child = spawn_with_logging(&mut cmd, window, "echo_log").unwrap();
/// ```
fn spawn_with_logging<R: Runtime>(
    cmd: &mut PCommand,
    window: Window<R>,
    event_name: &str,
) -> Result<Child, String> {
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().map(BufReader::new);
    let stderr = child.stderr.take().map(BufReader::new);

    if let Some(mut out) = stdout {
        let w = window.clone();
        let evt = event_name.to_string();
        std::thread::spawn(move || {
            let mut line = String::new();
            loop {
                line.clear();
                let Ok(n) = out.read_line(&mut line) else {
                    break;
                };
                if n == 0 {
                    break;
                }
                let _ = w.emit(&evt, format!("[out] {}", line.trim_end()));
            }
        });
    }

    if let Some(mut err) = stderr {
        let w = window.clone();
        let evt = event_name.to_string();
        std::thread::spawn(move || {
            let mut line = String::new();
            loop {
                line.clear();
                let Ok(n) = err.read_line(&mut line) else {
                    break;
                };
                if n == 0 {
                    break;
                }
                let _ = w.emit(&evt, format!("[err] {}", line.trim_end()));
            }
        });
    }

    Ok(child)
}

#[tauri::command]
pub async fn comfy_status() -> Result<bool, String> {
    let lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
    Ok(lock.as_ref().is_some())
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

    let child = spawn_with_logging(&mut cmd, window, "comfy_log")
        .map_err(|e| format!("Failed to start ComfyUI: {e}"))?;

    {
        let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        *lock = Some(child);
    }

    Ok(())
}

#[tauri::command]
pub async fn comfy_stop() -> Result<(), String> {
    let mut lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
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
) -> Result<(), String> {
    let mut cfg = load_config();
    if python_path.is_some() {
        cfg.python_path = python_path;
    }
    if comfy_path.is_some() {
        cfg.comfy_path = comfy_path;
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

/// Resolve the python interpreter path.
/// Priority: user setting -> env var -> PATH search -> default.
fn resolve_python_path() -> PathBuf {
    let mut cfg = load_config();

    if let Some(p) = &cfg.python_path {
        if !p.trim().is_empty() {
            return PathBuf::from(p);
        }
    }

    if let Ok(env_p) = std::env::var("BLOSSOM_PYTHON_PATH").or_else(|_| std::env::var("PYTHON")) {
        if !env_p.trim().is_empty() {
            let path = PathBuf::from(env_p);
            cfg.python_path = Some(path.to_string_lossy().to_string());
            let _ = save_config(&cfg);
            return path;
        }
    }

    let candidates: &[&str] = if cfg!(windows) {
        &["python.exe", "python3.exe", "py.exe"]
    } else {
        &["python3", "python"]
    };

    for cand in candidates {
        if let Ok(found) = which(cand) {
            cfg.python_path = Some(found.to_string_lossy().to_string());
            let _ = save_config(&cfg);
            return found;
        }
    }

    default_python()
}

/// Absolute path to python. Falls back to system default if unset.
fn conda_python() -> PathBuf {
    resolve_python_path()
}

fn default_comfy_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ComfyUI")
}

/// Resolve path to the HQ non-stream script (dev -> repo path; prod -> Resources).
fn script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("lofi_gpu_hq.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("lofi_gpu_hq.py")
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

/* ==============================
Serde-mapped types (camelCase)
============================== */

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct Section {
    pub name: String,
    pub bars: u32,
    pub chords: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")] // serialize to Python-friendly keys
pub struct SongSpec {
    #[serde(alias = "outDir")]
    pub out_dir: String,
    pub title: String,
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
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct AlbumMeta {
    pub track_count: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn song_spec_serializes_to_snake_case() {
        let spec = SongSpec {
            out_dir: "out".into(),
            title: "t".into(),
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
}

/* ==============================
Audio commands
============================== */

/// Non‑streaming generate (no progress). Returns a single wav path.
#[tauri::command]
pub async fn lofi_generate_gpu<R: Runtime>(
    app: AppHandle<R>,
    prompt: String,
    duration: Option<u32>,
    seed: Option<u64>,
) -> Result<String, String> {
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

    let output = PCommand::new(&py)
        .arg("-u")
        .arg(&script)
        .arg("--prompt")
        .arg(&prompt)
        .arg("--duration")
        .arg(dur.to_string())
        .arg("--seed")
        .arg(seed.to_string())
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Err("Python returned no path".into());
    }
    Ok(stdout)
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
    cmd.arg("-u")
        .arg(&script)
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
pub async fn generate_album(meta: AlbumRequest) -> Result<AlbumMeta, String> {
    Ok(AlbumMeta {
        track_count: meta.track_count,
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
NPC storage
============================== */

#[derive(Debug, Serialize, Deserialize)]
pub struct NPCData {
    pub name: String,
    pub race: String,
    pub class: String,
    pub personality: String,
    pub background: String,
    pub appearance: String,
}

fn npc_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("npc-storage");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn save_npc<R: Runtime>(app: AppHandle<R>, npc: NPCData) -> Result<(), String> {
    let dir = npc_storage_dir(&app)?;
    let file_name = format!(
        "{}_{}.json",
        npc.name.replace(' ', "_"),
        Local::now().format("%Y%m%d%H%M%S")
    );
    let path = dir.join(file_name);
    let json = serde_json::to_string_pretty(&npc).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NPC {
    pub id: String,
    pub name: String,
    pub race: String,
    pub class: String,
    pub personality: String,
    pub background: String,
    pub appearance: String,
}

#[tauri::command]
pub async fn list_npcs<R: Runtime>(app: AppHandle<R>) -> Result<Vec<NPC>, String> {
    let dir = npc_storage_dir(&app)?;
    let mut npcs = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let data: NPCData = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
            let id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_string();
            npcs.push(NPC {
                id,
                name: data.name,
                race: data.race,
                class: data.class,
                personality: data.personality,
                background: data.background,
                appearance: data.appearance,
            });
        }
    }

    Ok(npcs)
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
    let child = cmd
        .spawn()
        .map_err(|e| format!("failed to start ollama: {e}"))?;
    {
        let mut lock = OLLAMA_CHILD
            .get_or_init(|| Mutex::new(None))
            .lock()
            .unwrap();
        *lock = Some(child);
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
        let mut child = spawn_with_logging(&mut pull, window, "ollama_log")
            .map_err(|e| format!("ollama pull failed: {e}"))?;
        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("ollama pull failed".into());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_ollama() -> Result<(), String> {
    let mut lock = OLLAMA_CHILD
        .get_or_init(|| Mutex::new(None))
        .lock()
        .unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
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
pub async fn stocks_fetch<R: Runtime>(
    app: AppHandle<R>,
    tickers: Vec<String>,
    range: String,
) -> Result<StockBundle, String> {
    stocks_fetch_impl(app, tickers, range).await
}

#[tauri::command]
pub async fn stock_forecast<R: Runtime>(
    app: AppHandle<R>,
    symbol: String,
) -> Result<String, String> {
    let sym = symbol.to_uppercase();
    let url =
        format!("https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=5d&interval=1d");
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    let result = json["chart"]["result"]
        .get(0)
        .ok_or_else(|| "chart result missing".to_string())?;
    let timestamps = result["timestamp"].as_array().ok_or("timestamps missing")?;
    let closes = result["indicators"]["quote"]
        .get(0)
        .and_then(|q| q["close"].as_array())
        .ok_or("closes missing")?;
    let mut parts = Vec::new();
    for (ts, close) in timestamps.iter().zip(closes.iter()) {
        if let (Some(ts), Some(price)) = (ts.as_i64(), close.as_f64()) {
            if let Some(dt) = NaiveDateTime::from_timestamp_opt(ts, 0) {
                let date = dt.format("%Y-%m-%d").to_string();
                parts.push(format!("{date}: {:.2}", price));
            }
        }
    }
    let summary = parts.join(", ");
    let prompt = format!(
        "Here are recent closing prices for {sym}: {summary}. Provide a brief forecast for {sym}'s price trend over the next week."
    );
    let reply = general_chat(
        app,
        vec![ChatMessage {
            role: "user".into(),
            content: prompt,
        }],
    )
    .await?;
    Ok(reply)
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
    let url = format!(
        "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={sym}&apikey=demo"
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
            .map(|dt| dt.timestamp())
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
pub async fn generate_short(spec: ShortSpec) -> Result<String, String> {
    println!("Generating short: {:?}", spec);
    Ok("ok".into())
}
