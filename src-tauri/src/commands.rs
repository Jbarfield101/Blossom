// src-tauri/src/commands.rs
use std::{
    env,
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Command as PCommand, Stdio},
    sync::{Arc, Mutex, OnceLock},
    time::Duration,
};

use dirs;

use crate::python_helpers::conda_python;
use crate::task_queue::{Task, TaskCommand, TaskQueue};
use chrono::{Local, Utc};
use rand::{thread_rng, Rng};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::{Connection, Row, SqliteConnection};
use std::process::Command as StdCommand;
use sysinfo::System;
use tauri::async_runtime::Mutex as AsyncMutex;
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

impl<R: Runtime> LogEmitter for AppHandle<R> {
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
    *lock = Some(LoggedChild {
        child,
        tasks: vec![],
    });
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

/// Best-effort: kill any process listening on the given TCP `port`.
///
/// This is used to ensure we start with a clean slate for embedded servers
/// like ComfyUI (8188) and Ollama (11434). It attempts platform-specific
/// strategies and ignores errors where possible.
fn kill_port(port: u16) {
    #[cfg(windows)]
    {
        // Try PowerShell Get-NetTCPConnection to get PIDs then taskkill them.
        let ps_cmd = format!(
            "Get-NetTCPConnection -LocalPort {} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess",
            port
        );
        if let Ok(out) = StdCommand::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    if let Ok(pid) = line.trim().parse::<u32>() {
                        let _ = StdCommand::new("taskkill")
                            .args(["/PID", &pid.to_string(), "/F", "/T"]) // kill tree
                            .status();
                    }
                }
            }
        }
        // Fallback: netstat parsing in case the above fails.
        if let Ok(out) = StdCommand::new("cmd")
            .args(["/C", &format!("netstat -ano | findstr :{}", port)])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 5
                        && (parts[3].eq_ignore_ascii_case("LISTENING")
                            || parts[3].eq_ignore_ascii_case("LISTEN"))
                    {
                        if let Ok(pid) = parts[4].parse::<u32>() {
                            let _ = StdCommand::new("taskkill")
                                .args(["/PID", &pid.to_string(), "/F", "/T"]) // kill tree
                                .status();
                        }
                    } else if parts.len() >= 5 {
                        // Some Windows builds show STATE in column 4 or 5; still try to kill PID.
                        if let Ok(pid) = parts[parts.len() - 1].parse::<u32>() {
                            let _ = StdCommand::new("taskkill")
                                .args(["/PID", &pid.to_string(), "/F", "/T"]) // kill tree
                                .status();
                        }
                    }
                }
            }
        }
    }

    #[cfg(unix)]
    {
        // Try lsof to get PIDs bound to the port and kill them.
        if let Ok(out) = StdCommand::new("sh")
            .args(["-lc", &format!("lsof -ti :{} || true", port)])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    let _ = StdCommand::new("kill").args(["-9", line.trim()]).status();
                }
            }
        }
        // Fallback: fuser
        let _ = StdCommand::new("sh")
            .args(["-lc", &format!("fuser -k -n tcp {} || true", port)])
            .status();
    }
}

/// Spawn a command and forward its stdout and stderr to the frontend.
///
/// The command will have its standard streams piped and lines from both
/// streams will be emitted to the provided [`Window`] under `event_name`.
/// `stdout` lines are prefixed with `[out]` and `stderr` lines with `[err]`.
///
/// # Examples
///
/// ```ignore
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
pub async fn comfy_start<R: Runtime>(app: AppHandle<R>, dir: String) -> Result<(), String> {
    // Always ensure port 8188 is free before starting a fresh server.
    kill_port(8188);
    {
        let lock = COMFY_CHILD.get_or_init(|| Mutex::new(None)).lock().unwrap();
        if lock.is_some() {
            return Ok(()); // already running in this app instance
        }
    }

    let dir = if dir.trim().is_empty() {
        default_comfy_path(&app)
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

    let child = spawn_with_logging(cmd, app, "comfy_log")
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

fn default_comfy_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("ComfyUI");
        if dev.exists() {
            return dev;
        }
        let dev = cwd.join("src-tauri").join("ComfyUI");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("ComfyUI")
}

fn pdf_tools_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("pdf_tools.py");
        if dev.exists() {
            return dev;
        }

        let dev = cwd.join("python").join("pdf_tools.py");
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

        let dev = cwd.join("python").join("pdf_tools.py");
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
pub struct VaultSearchHit {
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

const EMBED_DIM: usize = 512;

fn hash_embed(text: &str) -> Vec<f32> {
    let mut vec = vec![0f32; EMBED_DIM];
    for token in text.split_whitespace() {
        let digest = Sha256::digest(token.to_lowercase().as_bytes());
        let bytes: [u8; 8] = digest[0..8].try_into().unwrap();
        let idx = (u64::from_be_bytes(bytes) as usize) % EMBED_DIM;
        vec[idx] += 1.0;
    }
    let norm = vec.iter().map(|v| v * v).sum::<f32>().sqrt();
    if norm > 0.0 {
        for v in &mut vec {
            *v /= norm;
        }
    }
    vec
}

fn vault_index_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(dir) = env::var("BLOSSOM_OUTPUT_DIR") {
        return PathBuf::from(dir).join("Index");
    }
    if let Some(home) = dirs::home_dir() {
        let settings = home.join(".blossom_settings.json");
        if settings.exists() {
            if let Ok(text) = fs::read_to_string(&settings) {
                if let Ok(v) = serde_json::from_str::<Value>(&text) {
                    if let Some(out) = v["output_folder"].as_str() {
                        return PathBuf::from(out).join("Index");
                    }
                }
            }
        }
    }
    PathBuf::from("Knowledge").join("Index")
}

#[tauri::command]
pub async fn vault_search<R: Runtime>(
    app: AppHandle<R>,
    query: String,
    k: Option<u32>,
) -> Result<Vec<VaultSearchHit>, String> {
    let k = k.unwrap_or(3) as usize;
    let db_path = vault_index_path(&app).join("index.sqlite");
    if !db_path.exists() {
        return Ok(Vec::new());
    }
    let mut conn = SqliteConnection::connect(&format!("sqlite:{}", db_path.to_string_lossy()))
        .await
        .map_err(|e| e.to_string())?;
    let rows = sqlx::query("SELECT doc_id, page_start, page_end, text, embedding FROM embeddings")
        .fetch_all(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    let qvec = hash_embed(&query);
    let mut hits = Vec::new();
    for row in rows {
        let doc_id: String = row.get("doc_id");
        let ps: i64 = row.get("page_start");
        let pe: i64 = row.get("page_end");
        let text: String = row.get("text");
        let blob: Vec<u8> = row.get("embedding");
        let mut emb = vec![0f32; blob.len() / 4];
        for (i, chunk) in blob.chunks_exact(4).enumerate() {
            emb[i] = f32::from_ne_bytes(chunk.try_into().unwrap());
        }
        let score: f32 = qvec.iter().zip(emb.iter()).map(|(a, b)| a * b).sum();
        hits.push(VaultSearchHit {
            doc_id,
            page_range: [ps as u32, pe as u32],
            text,
            score,
        });
    }
    hits.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    hits.truncate(k);
    Ok(hits)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_json_npc() {
        let content = "{\"intent\":\"npc\",\"confidence\":0.9}";
        assert_eq!(extract_intent(content), "npc");
    }

    #[test]
    fn parse_json_rules() {
        let content = "{\"intent\":\"rules\",\"confidence\":0.9}";
        assert_eq!(extract_intent(content), "rules");
    }

    #[test]
    fn parse_json_lore() {
        let content = "{\"intent\":\"lore\",\"confidence\":0.9}";
        assert_eq!(extract_intent(content), "lore");
    }

    #[test]
    fn parse_json_notes() {
        let content = "{\"intent\":\"notes\",\"confidence\":0.9}";
        assert_eq!(extract_intent(content), "notes");
    }

    #[test]
    fn hash_embed_produces_unit_vec() {
        let v = hash_embed("hello world");
        assert_eq!(v.len(), 512);
        let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
    }

    #[test]
    fn parse_json_low_confidence_defaults_to_notes() {
        let content = "{\"intent\":\"npc\",\"confidence\":0.2}";
        assert_eq!(extract_intent(content), "notes");
    }

    #[test]
    fn parse_plain_string() {
        assert_eq!(extract_intent("lore"), "lore");
        assert_eq!(extract_intent("unknown"), "notes");
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
        assert!(
            after <= before,
            "thread count increased from {before} to {after}"
        );
    }
}

/* ==============================
Blender integration
============================== */

#[tauri::command]
pub async fn blender_run_script(code: String, output_dir: Option<String>) -> Result<(), String> {
    let tmp = std::env::temp_dir().join("blossom_bpy_script.py");
    let mut code = code;
    if let Some(ref dir) = output_dir {
        code.push('\n');
        code.push_str(&format!(
            "bpy.ops.wm.save_mainfile(filepath=r\"{}/output.blend\")\n",
            dir
        ));
    }
    fs::write(&tmp, code).map_err(|e| e.to_string())?;

    let status = PCommand::new(blender_path())
        .arg("--background")
        .arg("--python")
        .arg(&tmp)
        .status()
        .map_err(|e| format!("failed to run blender: {e}"))?;

    if status.success() {
        if let Some(dir) = output_dir {
            let output_path = Path::new(&dir).join("output.blend");
            if output_path.exists() {
                Ok(())
            } else {
                Err("failed to save blend file".to_string())
            }
        } else {
            Ok(())
        }
    } else {
        Err(format!("blender exited with status {status}"))
    }
}

fn blender_path() -> PathBuf {
    if let Ok(p) = env::var("BLENDER_PATH") {
        if !p.trim().is_empty() {
            return PathBuf::from(p);
        }
    }
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
        .join("rules");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn save_rule<R: Runtime>(
    app: AppHandle<R>,
    rule: Value,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let id = rule["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = rule_storage_dir(&app)?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let json = serde_json::to_string_pretty(&rule).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_rules<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Value>, String> {
    let dir = rule_storage_dir(&app)?;
    let mut rules = Vec::new();
    if dir.exists() {
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json")
                && path.file_name().and_then(|s| s.to_str()) != Some("index.json")
            {
                let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
                rules.push(data);
            }
        }
    }
    Ok(rules)
}

/* ==============================
Spell storage
============================== */

fn spell_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("spells");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn save_spell<R: Runtime>(
    app: AppHandle<R>,
    spell: Value,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let id = spell["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = spell_storage_dir(&app)?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let json = serde_json::to_string_pretty(&spell).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_spells<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Value>, String> {
    let dir = spell_storage_dir(&app)?;
    let mut spells = Vec::new();
    if dir.exists() {
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json")
                && path.file_name().and_then(|s| s.to_str()) != Some("index.json")
            {
                let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let data: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
                spells.push(data);
            }
        }
    }
    Ok(spells)
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
    let id = lore["id"]
        .as_str()
        .ok_or_else(|| "missing id".to_string())?;
    let dir = lore_storage_dir(&app, &world)?;
    let path = dir.join(format!("{}.json", &id));
    if path.exists() && !overwrite.unwrap_or(false) {
        return Err("exists".into());
    }
    let json = serde_json::to_string_pretty(&lore).map_err(|e| e.to_string())?;
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
    mut npc: Value,
    overwrite: Option<bool>,
) -> Result<Value, String> {
    let id = npc["id"]
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

    match npc.get("portrait").and_then(|v| v.as_str()) {
        Some(p) if !p.is_empty() && p != "placeholder.png" => {
            let src = PathBuf::from(p);
            let ext = src.extension().and_then(|s| s.to_str()).unwrap_or("png");
            let dest = portraits.join(format!("{}.{}", &id, ext));
            fs::copy(&src, &dest).map_err(|e| e.to_string())?;
            npc["portrait"] = Value::String(dest.to_string_lossy().into());
        }
        _ => {
            let dest = portraits.join(format!("{}.png", &id));
            create_placeholder_image(&dest, 900, 1200)?;
            npc["portrait"] = Value::String(dest.to_string_lossy().into());
        }
    }

    match npc.get("icon").and_then(|v| v.as_str()) {
        Some(p) if !p.is_empty() && p != "placeholder-icon.png" => {
            let src = PathBuf::from(p);
            let ext = src.extension().and_then(|s| s.to_str()).unwrap_or("png");
            let dest = icons.join(format!("{}.{}", &id, ext));
            fs::copy(&src, &dest).map_err(|e| e.to_string())?;
            npc["icon"] = Value::String(dest.to_string_lossy().into());
        }
        _ => {
            let dest = icons.join(format!("{}.png", &id));
            create_placeholder_image(&dest, 300, 300)?;
            npc["icon"] = Value::String(dest.to_string_lossy().into());
        }
    }
    let json = serde_json::to_string_pretty(&npc).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(npc)
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
    error_code: Option<String>,
    message: Option<String>,
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
    let mut entry = json!({
        "timestamp": Utc::now().to_rfc3339(),
        "world": world,
        "id": id,
        "name": name,
    });
    if let Some(code) = error_code {
        entry["errorCode"] = Value::String(code);
    }
    if let Some(msg) = message {
        entry["message"] = Value::String(msg);
    }
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

#[tauri::command]
pub async fn clear_npc_log<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data dir".to_string())?
        .join("npc")
        .join("log");
    let path = dir.join("npc-import.log");
    if path.exists() {
        fs::write(&path, "").map_err(|e| e.to_string())?;
    }
    Ok(())
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
pub async fn start_ollama<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    // Always ensure port 11434 is free before starting a fresh server.
    kill_port(11434);
    let client = reqwest::Client::new();
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
        // Use AppHandle as emitter for logs when pulling the model
        let child = spawn_with_logging(pull, app.clone(), "ollama_log")
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

#[cfg(not(test))]
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
        let mut ctx = String::new();
        if let Ok(results) = pdf_search(app.clone(), query.clone(), None).await {
            if !results.is_empty() {
                ctx.push_str("Relevant documents:\n");
                for r in &results {
                    ctx.push_str(&format!(
                        "- {} p.{}-{}: {}\n",
                        r.doc_id, r.page_range[0], r.page_range[1], r.text
                    ));
                }
            }
        }
        if let Ok(notes) = vault_search(app.clone(), query, None).await {
            if !notes.is_empty() {
                ctx.push_str("Relevant notes:\n");
                for n in &notes {
                    ctx.push_str(&format!(
                        "- {} p.{}-{}: {}\n",
                        n.doc_id, n.page_range[0], n.page_range[1], n.text
                    ));
                }
            }
        }
        if !ctx.is_empty() {
            msgs.push(ChatMessage {
                role: "system".into(),
                content: ctx,
            });
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

#[cfg(test)]
#[tauri::command]
pub async fn general_chat<R: Runtime>(
    _app: AppHandle<R>,
    _messages: Vec<ChatMessage>,
) -> Result<String, String> {
    Ok("{\"shortTerm\":\"up\",\"longTerm\":\"down\"}".into())
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
                    "content": "You are an intent classifier. Reply ONLY in JSON with fields intent and confidence (0-1). intent must be one of npc, rules, lore, or notes. npc = questions about non-player characters, rules = game mechanics or rules, lore = world or setting information, notes = personal or miscellaneous notes.",
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
        .unwrap_or("notes");
    Ok(extract_intent(content))
}

fn extract_intent(content: &str) -> String {
    let trimmed = content.trim();
    const INTENTS: [&str; 4] = ["npc", "rules", "lore", "notes"];
    if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
        if let Some(intent) = v["intent"].as_str() {
            let confidence = v["confidence"].as_f64().unwrap_or(0.0);
            if confidence >= 0.5 && INTENTS.contains(&intent) {
                return intent.to_string();
            }
        }
        return "notes".to_string();
    }
    let lower = trimmed.to_lowercase();
    if INTENTS.contains(&lower.as_str()) {
        lower
    } else {
        "notes".to_string()
    }
}

#[cfg(test)]
mod intent_tests {
    use super::extract_intent;

    #[test]
    fn parses_npc() {
        assert_eq!(
            extract_intent("{\"intent\":\"npc\",\"confidence\":0.9}"),
            "npc"
        );
    }

    #[test]
    fn parses_rules() {
        assert_eq!(
            extract_intent("{\"intent\":\"rules\",\"confidence\":0.8}"),
            "rules"
        );
    }

    #[test]
    fn parses_lore() {
        assert_eq!(
            extract_intent("{\"intent\":\"lore\",\"confidence\":0.95}"),
            "lore"
        );
    }

    #[test]
    fn parses_notes() {
        assert_eq!(
            extract_intent("{\"intent\":\"notes\",\"confidence\":0.99}"),
            "notes"
        );
    }

    #[test]
    fn defaults_to_notes_on_low_confidence() {
        assert_eq!(
            extract_intent("{\"intent\":\"npc\",\"confidence\":0.2}"),
            "notes"
        );
    }
}

/* ==============================
Transcription
============================== */

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptEntry {
    pub session_id: String,
    pub speaker_id: String,
    pub start: f64,
    pub end: f64,
    pub text: String,
}

fn transcripts_path() -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    let _ = fs::create_dir_all(&dir);
    dir.push("transcripts.jsonl");
    dir
}

fn transcripts_audio_dir(session_id: &str) -> PathBuf {
    let mut dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push(".blossom");
    dir.push("transcripts");
    dir.push(session_id);
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

fn higgs_tts_script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("higgs_tts.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("higgs_tts.py")
}

fn summarize_session_script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd
            .join("src-tauri")
            .join("python")
            .join("summarize_session.py");
        if dev.exists() {
            return dev;
        }
    }
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("summarize_session.py")
}

fn script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    transcribe_script_path(app)
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

fn run_summarize_session_script<R: Runtime>(
    app: &AppHandle<R>,
    transcripts: &Path,
    session_id: &str,
) -> Result<String, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = summarize_session_script_path(app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    if !transcripts.exists() {
        return Err(format!(
            "transcripts file not found at {}",
            transcripts.display()
        ));
    }
    let output = PCommand::new(&py)
        .arg(&script)
        .arg(transcripts)
        .arg(session_id)
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("FileNotFoundError") {
            return Err("model file not found — please download the .onnx model".into());
        }
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn save_transcripts(entry: &TranscriptEntry) -> Result<(), String> {
    let path = transcripts_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    let line = serde_json::to_string(entry).map_err(|e| e.to_string())?;
    writeln!(file, "{}", line).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_transcripts() -> Result<Vec<TranscriptEntry>, String> {
    let path = transcripts_path();
    if let Ok(file) = fs::File::open(path) {
        let reader = BufReader::new(file);
        let mut entries = Vec::new();
        for line in reader.lines() {
            if let Ok(line) = line {
                if let Ok(entry) = serde_json::from_str::<TranscriptEntry>(&line) {
                    entries.push(entry);
                }
            }
        }
        Ok(entries)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn transcribe_audio<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
    speaker_id: String,
    start: f64,
    end: f64,
    data: Vec<u8>,
) -> Result<String, String> {
    if data.is_empty() {
        return Err("no audio data provided".into());
    }
    let audio_dir = transcripts_audio_dir(&session_id);
    let file_name = format!("{}-{}.wav", (start * 1000.0) as u64, (end * 1000.0) as u64);
    let audio_path = audio_dir.join(file_name);
    fs::write(&audio_path, &data).map_err(|e| e.to_string())?;
    let text = run_transcribe_script(&app, &audio_path)?.trim().to_string();

    let entry = TranscriptEntry {
        session_id: session_id.clone(),
        speaker_id: speaker_id.clone(),
        start,
        end,
        text: text.clone(),
    };
    save_transcripts(&entry)?;

    Ok(text)
}

#[tauri::command]
pub async fn summarize_session<R: Runtime>(
    app: AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    let transcripts = transcripts_path();
    run_summarize_session_script(&app, &transcripts, &session_id)
}

#[tauri::command]
pub async fn higgs_tts<R: Runtime>(
    app: AppHandle<R>,
    text: String,
    speaker: String,
) -> Result<Vec<u8>, String> {
    let py = conda_python();
    if !py.exists() {
        return Err(format!("Python not found at {}", py.display()));
    }
    let script = higgs_tts_script_path(&app);
    if !script.exists() {
        return Err(format!("Script not found at {}", script.display()));
    }
    let output = PCommand::new(&py)
        .arg(&script)
        .arg("--text")
        .arg(&text)
        .arg("--speaker")
        .arg(&speaker)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to start python: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Python exited with status {}:\n{}",
            output.status, stderr
        ));
    }
    Ok(output.stdout)
}

#[tauri::command]
pub async fn dj_mix<R: Runtime>(
    app: AppHandle<R>,
    specs: Vec<String>,
    out: String,
    host: bool,
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
    let script = higgs_tts_script_path(&app);
    let py_dir = script
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "Script path not found".to_string())?;
    let ambience = py_dir.join("ambience_generator.py");
    if !ambience.exists() {
        return Err(format!(
            "ambience_generator.py not found at {}",
            ambience.display()
        ));
    }
    let output = PCommand::new(&py)
        .arg(&ambience)
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
    command: Value,
) -> Result<u64, String> {
    let payload = command.clone();
    let command = serde_json::from_value::<TaskCommand>(command)
        .map_err(|e| format!("invalid task command: {e}; payload: {payload}"))?;
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

// Save a blob to a temp file and return the absolute path.
#[tauri::command]
pub async fn save_temp_file(file_name: String, data: Vec<u8>) -> Result<String, String> {
    let mut dir = std::env::temp_dir();
    dir.push("blossom");
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("failed to create temp dir: {e}"));
    }
    let safe_name = file_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    let ts = chrono::Utc::now().timestamp_millis();
    let path = dir.join(format!("{}-{}", ts, safe_name));
    fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
