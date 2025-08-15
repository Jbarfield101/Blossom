// src-tauri/src/commands.rs
use std::{
    fs,
    io::{BufRead, BufReader, Read},
    path::PathBuf,
    process::{Child, Command as PCommand, Stdio},
    sync::{Mutex, OnceLock},
};

use chrono::Local;
use rss::Channel;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};
use ureq;

/* ==============================
ComfyUI launcher (no extra crate)
============================== */

static COMFY_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static OLLAMA_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

fn comfy_dir() -> PathBuf {
    // TODO: put your ComfyUI repo folder here
    // e.g.: PathBuf::from(r"C:\dev\ComfyUI")
    PathBuf::from(r"C:\Comfy\ComfyUI")
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
pub async fn comfy_start<R: Runtime>(window: Window<R>) -> Result<(), String> {
    {
        let lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        if lock.is_some() {
            return Ok(()); // already running
        }
    }

    let dir = comfy_dir();
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

/// Absolute path to your conda env's python.exe.
fn conda_python() -> PathBuf {
    PathBuf::from(r"C:\Users\Owner\.conda\envs\blossom-ml\python.exe")
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

/// Resolve path to the stream script.
fn script_stream_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd
            .join("src-tauri")
            .join("python")
            .join("lofi_gpu_stream.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("lofi_gpu_stream.py")
}

/* ==============================
Serde-mapped types (camelCase)
============================== */

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Section {
    pub name: String,
    pub bars: u32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")] // outDir -> out_dir, etc
pub struct SongSpec {
    pub title: String,
    pub out_dir: String,
    pub bpm: u32,
    pub key: String,
    pub structure: Vec<Section>,
    pub mood: Vec<String>,
    pub instruments: Vec<String>,
    pub ambience: Vec<String>,
    pub ambience_level: Option<f32>,
    pub seed: u64,
    pub variety: Option<u32>,
    pub drum_pattern: Option<String>,
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

/// Streaming generate (emits "lofi_progress" events). Returns the final wav path.
#[tauri::command]
pub async fn lofi_generate_gpu_stream<R: Runtime>(
    window: Window<R>,
    app: AppHandle<R>,
    prompt: String,
    total_seconds: u32,
    bpm: Option<u32>,
    style: Option<String>,
    seed: Option<u64>,
    out_dir: Option<String>,
) -> Result<String, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }

    let script = script_stream_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }

    // Build the python process
    let mut cmd = PCommand::new(py);
    cmd.arg("-u")
        .arg(&script)
        .arg("--prompt")
        .arg(&prompt)
        .arg("--total-seconds")
        .arg(total_seconds.to_string())
        .arg("--seed")
        .arg(seed.unwrap_or(42).to_string());

    if let Some(b) = bpm {
        cmd.arg("--bpm").arg(b.to_string());
    }
    if let Some(s) = style {
        if !s.is_empty() {
            cmd.arg("--style").arg(s);
        }
    }

    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start python: {e}"))?;

    // Read line-by-line from stdout; emit progress; capture FILE path
    let mut stdout = BufReader::new(child.stdout.take().unwrap());
    let mut final_path: Option<String> = None;

    let mut line = String::new();
    loop {
        line.clear();
        let read = stdout.read_line(&mut line).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        let t = line.trim();

        if let Some(rest) = t.strip_prefix("PROG ") {
            if let Ok(p) = rest.parse::<u8>() {
                let _ = window.emit("lofi_progress", p);
            }
        } else if let Some(rest) = t.strip_prefix("FILE ") {
            final_path = Some(rest.to_string());
        } else {
            let _ = window.emit("lofi_progress", t.to_string());
        }
    }

    // Drain stderr if needed
    let mut stderr_s = String::new();
    if let Some(mut e) = child.stderr.take() {
        let _ = e.read_to_string(&mut stderr_s);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("Python exited with {status}: {stderr_s}"));
    }

    let mut path = match final_path {
        Some(p) => PathBuf::from(p),
        None => return Err("No FILE line received from python".into()),
    };

    if let Some(dir) = out_dir {
        let dir_path = PathBuf::from(&dir);
        fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
        if let Some(name) = path.file_name() {
            let target = dir_path.join(name);
            fs::rename(&path, &target).map_err(|e| e.to_string())?;
            path = target;
        }
    }

    Ok(path.to_string_lossy().to_string())
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
Ollama general chat
============================== */

#[derive(Debug, Deserialize, Serialize)]
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
    // check if already running
    if ureq::get("http://127.0.0.1:11434/")
        .timeout(std::time::Duration::from_millis(500))
        .call()
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
        if ureq::get("http://127.0.0.1:11434/")
            .timeout(std::time::Duration::from_millis(500))
            .call()
            .is_ok()
        {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    if ureq::get("http://127.0.0.1:11434/")
        .timeout(std::time::Duration::from_millis(500))
        .call()
        .is_err()
    {
        return Err("Ollama did not start".into());
    }

    // check model
    let resp = ureq::get("http://127.0.0.1:11434/api/tags")
        .call()
        .map_err(|e| e.to_string())?;
    let json: Value = resp.into_json().map_err(|e| e.to_string())?;
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
pub async fn general_chat(messages: Vec<ChatMessage>) -> Result<String, String> {
    let resp = ureq::post("http://127.0.0.1:11434/api/chat")
        .set("Content-Type", "application/json")
        .send_json(ureq::json!({
          "model": "gpt-oss:20b",
          "stream": false,
          "messages": messages,
        }))
        .map_err(|e| e.to_string())?;

    let json: Value = resp.into_json().map_err(|e| e.to_string())?;
    let content = json["message"]["content"]
        .as_str()
        .or_else(|| json["content"].as_str())
        .ok_or("no content")?;
    Ok(content.to_string())
}

use once_cell::sync::Lazy;
use std::time::{Duration, Instant};

#[derive(Serialize, Clone)]
pub struct NewsArticle {
    pub title: String,
    pub link: String,
    pub pub_date: Option<String>,
    pub source: String,
}

static NEWS_CACHE: Lazy<Mutex<Option<(Instant, Vec<NewsArticle>)>>> =
    Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub async fn fetch_big_brother_news(force: Option<bool>) -> Result<Vec<NewsArticle>, String> {
    let force = force.unwrap_or(false);

    {
        let cache = NEWS_CACHE.lock().unwrap();
        if !force {
            if let Some((last_fetch, data)) = &*cache {
                if last_fetch.elapsed() < Duration::from_secs(3600) {
                    return Ok(data.clone());
                }
            }
        }
    }

    let feeds = vec![
        ("Big Brother Network", "https://bigbrothernetwork.com/feed/"),
        (
            "Reality Blurred",
            "https://www.realityblurred.com/realitytv/tag/big-brother/feed/",
        ),
    ];

    let mut articles = Vec::new();

    for (source, url) in feeds {
        let resp = ureq::get(url).call().map_err(|e| e.to_string())?;
        let body = resp.into_string().map_err(|e| e.to_string())?;
        let channel = Channel::read_from(body.as_bytes()).map_err(|e| e.to_string())?;
        for item in channel.items() {
            let title = item.title().unwrap_or("Untitled").to_string();
            let link = item.link().unwrap_or("").to_string();
            let pub_date = item.pub_date().map(|s| s.to_string());
            articles.push(NewsArticle {
                title,
                link,
                pub_date,
                source: source.to_string(),
            });
        }
    }

    let mut cache = NEWS_CACHE.lock().unwrap();
    *cache = Some((Instant::now(), articles.clone()));

    Ok(articles)
}
