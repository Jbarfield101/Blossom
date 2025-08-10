// src-tauri/src/commands.rs
use std::{
  fs,
  io::{BufRead, BufReader, Read},
  path::PathBuf,
  process::{Command as PCommand, Stdio},
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime, Window};

/* ---------- Python paths ---------- */

/// Absolute path to your GPU conda env's python.exe. Change if needed.
fn conda_python() -> PathBuf {
  PathBuf::from(r"C:\Users\Owner\.conda\envs\blossom-ml\python.exe")
}

/// Resolve path to the non-stream script (dev -> repo path; prod -> Resources).
fn script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
  if let Ok(cwd) = std::env::current_dir() {
    let dev = cwd.join("src-tauri").join("python").join("lofi_gpu.py");
    if dev.exists() {
      return dev;
    }
  }
  app.path()
    .resource_dir()
    .expect("resource dir")
    .join("python")
    .join("lofi_gpu.py")
}

/// Resolve path to the stream script.
fn script_stream_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
  if let Ok(cwd) = std::env::current_dir() {
    let dev = cwd.join("src-tauri").join("python").join("lofi_gpu_stream.py");
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

/* ---------- Serde-mapped types (camelCase from UI) ---------- */

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Section {
  pub name: String,
  pub bars: u32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")] // maps outDir -> out_dir, etc.
pub struct SongSpec {
  pub title: String,
  pub out_dir: String,
  pub bpm: u32,
  pub key: String,
  pub structure: Vec<Section>,
  pub mood: Vec<String>,
  pub instruments: Vec<String>,
  pub ambience: Vec<String>,
  pub seed: u64,
}

/* ---------- Commands ---------- */

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
    .arg("--prompt").arg(&prompt)
    .arg("--duration").arg(dur.to_string())
    .arg("--seed").arg(seed.to_string())
    .output()
    .map_err(|e| format!("Failed to start python: {e}"))?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    return Err(format!("Python exited with status {}:\n{}", output.status, stderr));
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
     .arg("--prompt").arg(&prompt)
     .arg("--total-seconds").arg(total_seconds.to_string())
     .arg("--seed").arg(seed.unwrap_or(42).to_string());

  if let Some(b) = bpm {
    cmd.arg("--bpm").arg(b.to_string());
  }
  if let Some(s) = style {
    if !s.is_empty() {
      cmd.arg("--style").arg(s);
    }
  }

  let mut child = cmd.stdout(Stdio::piped()).stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to start python: {e}"))?;

  // Read line-by-line from stdout; emit progress; capture FILE path
  let mut stdout = BufReader::new(child.stdout.take().unwrap());
  let mut final_path: Option<String> = None;

  let mut line = String::new();
  loop {
    line.clear();
    let read = stdout.read_line(&mut line).map_err(|e| e.to_string())?;
    if read == 0 { break; }
    let t = line.trim();

    if let Some(rest) = t.strip_prefix("PROG ") {
      if let Ok(p) = rest.parse::<u8>() {
        let _ = window.emit("lofi_progress", p);
      }
    } else if let Some(rest) = t.strip_prefix("FILE ") {
      final_path = Some(rest.to_string());
    } else {
      // forward any other lines for debugging
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
    std::fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    if let Some(name) = path.file_name() {
      let target = dir_path.join(name);
      std::fs::rename(&path, &target).map_err(|e| e.to_string())?;
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
  spec: SongSpec, // <-- typed, with #[serde(rename_all="camelCase")]
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
    .arg("--song-json").arg(json_str)
    .arg("--out").arg(&out_path)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

  window.emit("lofi_progress", r#"{"stage":"start","message":"starting"}"#).ok();

  let mut child = cmd.spawn().map_err(|e| format!("Failed to start python: {e}"))?;
  let mut stdout = BufReader::new(child.stdout.take().unwrap());
  let mut line = String::new();

  // Forward JSON status lines printed by Python to the UI
  loop {
    line.clear();
    let read = stdout.read_line(&mut line).map_err(|e| e.to_string())?;
    if read == 0 { break; }
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

  window.emit("lofi_progress", r#"{"stage":"done","message":"saved"}"#).ok();
  Ok(out_path.to_string_lossy().to_string())
}
