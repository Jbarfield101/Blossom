// src-tauri/src/commands.rs
use std::{path::PathBuf, process::Command};
use tauri::{AppHandle, Manager, Runtime};

/// Absolute path to the Python we want to use (your GPU conda env).
/// Change this if your env is somewhere else.
fn conda_python() -> PathBuf {
    PathBuf::from(r"C:\Users\Owner\.conda\envs\blossom-ml\python.exe")
}

/// Resolve the path to our lofi script.
///
/// During dev we prefer the repo path:
///   <repo>\src-tauri\python\lofi_gpu.py
///
/// When packaged we fall back to the app Resources:
///   Resources\python\lofi_gpu.py
fn script_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    // Try dev path first (works when running `tauri dev`)
    if let Ok(cwd) = std::env::current_dir() {
        let dev = cwd.join("src-tauri").join("python").join("lofi_gpu.py");
        if dev.exists() {
            return dev;
        }
    }

    // Fallback: packaged resource path (works in the built/bundled app)
    app.path()
        .resource_dir()
        .expect("resource dir")
        .join("python")
        .join("lofi_gpu.py")
}

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

    let output = Command::new(&py)
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

    // Our Python prints the generated .wav path to stdout
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Err("Python returned no path".into());
    }
    Ok(stdout)
}
