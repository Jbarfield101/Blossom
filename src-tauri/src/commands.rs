// src-tauri/src/commands.rs
use std::{
  io::{BufRead, BufReader},
  path::PathBuf,
  process::{Command as PCommand, Stdio},
};
use tauri::{AppHandle, Manager, Runtime, Window};

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

  match final_path {
    Some(p) => Ok(p),
    None => Err("No FILE line received from python".into()),
  }
}
