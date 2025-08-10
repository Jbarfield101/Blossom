// src-tauri/src/commands.rs
use std::{
  io::{BufRead, BufReader},
  path::PathBuf,
  process::{Command as PCommand, Stdio},
};
use tauri::{AppHandle, Manager, Runtime, Window, Emitter};
use chrono::Local;
use serde_json::Value;

/// Absolute path to your GPU conda env's python.exe.
/// Change this if your env path differs.
fn conda_python() -> PathBuf {
  PathBuf::from(r"C:\Users\Owner\.conda\envs\blossom-ml\python.exe")
}

/// Resolve path to the non-stream script (dev -> repo path; prod -> bundled Resources).
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
    }
  }

  // Drain stderr if needed
  let mut stderr_s = String::new();
  if let Some(mut e) = child.stderr.take() {
    use std::io::Read;
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

/// Run full-song generation based on a structured spec.
#[tauri::command]
pub async fn run_lofi_song<R: Runtime>(
  window: Window<R>,
  app: AppHandle<R>,
  spec: Value,
) -> Result<String, String> {
  let py = conda_python();
  if !py.exists() {
    return Err(format!("Python not found at {}", py.display()));
  }

  let script = script_path(&app);
  if !script.exists() {
    return Err(format!("Script not found at {}", script.display()));
  }

  let out_dir = spec
    .get("outDir")
    .and_then(|v| v.as_str())
    .ok_or("spec.outDir missing")?;
  std::fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;

  let title = spec
    .get("title")
    .and_then(|v| v.as_str())
    .unwrap_or("Song");
  let stamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
  let file_name = format!("{} - {}.wav", title, stamp);
  let out_path = PathBuf::from(out_dir).join(file_name);

  let json_str = serde_json::to_string(&spec).map_err(|e| e.to_string())?;

  let mut cmd = PCommand::new(&py);
  cmd.arg("-u")
    .arg(&script)
    .arg("--song-json").arg(json_str)
    .arg("--out").arg(&out_path)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

  let mut child = cmd.spawn().map_err(|e| format!("Failed to start python: {e}"))?;
  let mut stdout = BufReader::new(child.stdout.take().unwrap());
  let mut line = String::new();
  loop {
    line.clear();
    let read = stdout.read_line(&mut line).map_err(|e| e.to_string())?;
    if read == 0 { break; }
    let _ = window.emit("lofi_progress", line.trim().to_string());
  }

  let mut stderr_s = String::new();
  if let Some(mut e) = child.stderr.take() {
    use std::io::Read;
    let _ = e.read_to_string(&mut stderr_s);
  }

  let status = child.wait().map_err(|e| e.to_string())?;
  if !status.success() {
    return Err(format!("Python exited with {status}: {stderr_s}"));
  }

  Ok(out_path.to_string_lossy().to_string())
}
