use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader};
use std::process::{Command as PCommand, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sysinfo::System;
use tauri::async_runtime::{self, JoinHandle};
use tokio::sync::{mpsc, Semaphore};
use tokio::time::sleep;

use crate::commands::ShortSpec;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskCommand {
    /// Placeholder variant for future expansion.
    Example,
    LofiGenerateGpu {
        py: String,
        script: String,
        prompt: String,
        duration: u32,
        seed: u64,
    },
    PdfIngest {
        py: String,
        script: String,
        doc_id: String,
    },
    ParseNpcPdf {
        #[serde(default = "crate::commands::conda_python_string")]
        py: String,
        #[serde(default = "crate::commands::pdf_tools_path_string")]
        script: String,
        path: String,
        world: String,
    },
    ParseSpellPdf {
        #[serde(default = "crate::commands::conda_python_string")]
        py: String,
        #[serde(default = "crate::commands::pdf_tools_path_string")]
        script: String,
        path: String,
    },
    ParseLorePdf {
        #[serde(default = "crate::commands::conda_python_string")]
        py: String,
        #[serde(default = "crate::commands::pdf_tools_path_string")]
        script: String,
        path: String,
        world: String,
    },
    GenerateShort {
        spec: ShortSpec,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: u64,
    pub label: String,
    pub command: TaskCommand,
    pub status: TaskStatus,
    pub progress: f32,
    pub result: Option<Value>,
}

enum Message {
    Enqueue(Task),
    Cancel(u64),
}

pub struct TaskQueue {
    tx: mpsc::Sender<Message>,
    tasks: Arc<Mutex<HashMap<u64, Task>>>,
    handles: Arc<Mutex<HashMap<u64, JoinHandle<()>>>>,
    cancelled: Arc<Mutex<HashSet<u64>>>,
    limits: Arc<Mutex<ResourceLimits>>,
}

#[derive(Clone)]
struct ResourceLimits {
    cpu: f32,
    memory: f32,
}

impl TaskQueue {
    pub fn new(concurrency: usize, cpu_limit: f32, memory_limit: f32) -> Self {
        let (tx, mut rx) = mpsc::channel(100);
        let tasks = Arc::new(Mutex::new(HashMap::new()));
        let handles = Arc::new(Mutex::new(HashMap::new()));
        let cancelled = Arc::new(Mutex::new(HashSet::new()));
        let limits = Arc::new(Mutex::new(ResourceLimits {
            cpu: cpu_limit,
            memory: memory_limit,
        }));
        let tasks_worker = tasks.clone();
        let handles_worker = handles.clone();
        let cancelled_worker = cancelled.clone();
        let limits_worker = limits.clone();
        async_runtime::spawn(async move {
            let semaphore = Arc::new(Semaphore::new(concurrency));
            while let Some(msg) = rx.recv().await {
                match msg {
                    Message::Enqueue(task) => {
                        {
                            let mut map = tasks_worker.lock().unwrap();
                            map.insert(task.id, task.clone());
                        }
                        if cancelled_worker.lock().unwrap().contains(&task.id) {
                            if let Some(t) = tasks_worker.lock().unwrap().get_mut(&task.id) {
                                t.status = TaskStatus::Cancelled;
                            }
                            continue;
                        }
                        let tasks_clone = tasks_worker.clone();
                        let limits_clone = limits_worker.clone();
                        let cancelled_clone = cancelled_worker.clone();
                        let command = task.command.clone();
                        let permit = semaphore.clone().acquire_owned().await.unwrap();
                        let id = task.id;
                        let handle = async_runtime::spawn(async move {
                            loop {
                                let (cpu_limit, mem_limit) = {
                                    let l = limits_clone.lock().unwrap();
                                    (l.cpu, l.memory)
                                };
                                let mut sys = System::new();
                                sys.refresh_cpu();
                                std::thread::sleep(Duration::from_millis(100));
                                sys.refresh_cpu();
                                sys.refresh_memory();
                                let cpu_usage = sys.global_cpu_info().cpu_usage();
                                let mem_usage = if sys.total_memory() > 0 {
                                    (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0
                                } else {
                                    0.0
                                };
                                if cpu_usage < cpu_limit && mem_usage < mem_limit {
                                    break;
                                }
                                sleep(Duration::from_secs(1)).await;
                            }
                            {
                                let mut map = tasks_clone.lock().unwrap();
                                if let Some(t) = map.get_mut(&id) {
                                    t.status = TaskStatus::Running;
                                }
                            }
                            let res: Result<Value, String> = match command {
                                TaskCommand::Example => Ok(Value::Null),
                                TaskCommand::LofiGenerateGpu {
                                    py,
                                    script,
                                    prompt,
                                    duration,
                                    seed,
                                } => {
                                    let output = PCommand::new(&py)
                                        .arg("-u")
                                        .arg(&script)
                                        .arg("--prompt")
                                        .arg(&prompt)
                                        .arg("--duration")
                                        .arg(duration.to_string())
                                        .arg("--seed")
                                        .arg(seed.to_string())
                                        .output()
                                        .map_err(|e| format!("Failed to start python: {e}"))?;
                                    if !output.status.success() {
                                        let stderr = String::from_utf8_lossy(&output.stderr);
                                        Err(format!(
                                            "Python exited with status {}:\n{}",
                                            output.status, stderr
                                        ))
                                    } else {
                                        let stdout = String::from_utf8_lossy(&output.stdout)
                                            .trim()
                                            .to_string();
                                        if stdout.is_empty() {
                                            Err("Python returned no path".into())
                                        } else {
                                            Ok(Value::String(stdout))
                                        }
                                    }
                                }
                                TaskCommand::PdfIngest { py, script, doc_id } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("ingest")
                                        .arg(&doc_id)
                                        .output()
                                        .map_err(|e| format!("Failed to start python: {e}"))?;
                                    if !output.status.success() {
                                        let stderr = String::from_utf8_lossy(&output.stderr);
                                        Err(format!(
                                            "Python exited with status {}:\n{}",
                                            output.status, stderr
                                        ))
                                    } else {
                                        let stdout = String::from_utf8_lossy(&output.stdout);
                                        serde_json::from_str::<Value>(&stdout)
                                            .map_err(|e| e.to_string())
                                    }
                                }
                                TaskCommand::ParseNpcPdf { py, script, path, world: _ } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("npcs")
                                        .arg(&path)
                                        .output()
                                        .map_err(|e| format!("Failed to start python: {e}"))?;
                                    if !output.status.success() {
                                        let stderr = String::from_utf8_lossy(&output.stderr);
                                        Err(format!(
                                            "Python exited with status {}:\n{}",
                                            output.status, stderr
                                        ))
                                    } else {
                                        let stdout = String::from_utf8_lossy(&output.stdout);
                                        serde_json::from_str::<Value>(&stdout)
                                            .map_err(|e| e.to_string())
                                    }
                                }
                                TaskCommand::ParseSpellPdf { py, script, path } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("spells")
                                        .arg(&path)
                                        .output()
                                        .map_err(|e| format!("Failed to start python: {e}"))?;
                                    if !output.status.success() {
                                        let stderr = String::from_utf8_lossy(&output.stderr);
                                        Err(format!(
                                            "Python exited with status {}:\n{}",
                                            output.status, stderr
                                        ))
                                    } else {
                                        let stdout = String::from_utf8_lossy(&output.stdout);
                                        serde_json::from_str::<Value>(&stdout)
                                            .map_err(|e| e.to_string())
                                    }
                                }
                                TaskCommand::ParseLorePdf { py, script, path, world: _ } => {
                                    let mut cmd = PCommand::new(&py);
                                    cmd.arg(&script)
                                        .arg("lore")
                                        .arg(&path)
                                        .stdout(Stdio::piped())
                                        .stderr(Stdio::piped());
                                    let mut child = cmd
                                        .spawn()
                                        .map_err(|e| format!("Failed to start python: {e}"))?;
                                    let stdout = child.stdout.take().ok_or("no stdout".to_string())?;
                                    let mut reader = BufReader::new(stdout);
                                    let mut output = String::new();
                                    loop {
                                        let mut line = String::new();
                                        let n = reader.read_line(&mut line).map_err(|e| e.to_string())?;
                                        if n == 0 {
                                            break;
                                        }
                                        if let Ok(p) = line.trim().parse::<f32>() {
                                            let mut map = tasks_clone.lock().unwrap();
                                            if let Some(t) = map.get_mut(&id) {
                                                t.progress = p;
                                            }
                                        } else {
                                            output.push_str(&line);
                                        }
                                        if cancelled_clone.lock().unwrap().contains(&id) {
                                            let _ = child.kill();
                                            return Err("cancelled".into());
                                        }
                                    }
                                    let status = child.wait().map_err(|e| e.to_string())?;
                                    if !status.success() {
                                        let mut err = String::new();
                                        if let Some(mut e) = child.stderr.take() {
                                            use std::io::Read;
                                            let _ = e.read_to_string(&mut err);
                                        }
                                        Err(format!(
                                            "Python exited with status {}:\n{}",
                                            status, err
                                        ))
                                    } else {
                                        serde_json::from_str::<Value>(&output).map_err(|e| e.to_string())
                                    }
                                }
                                TaskCommand::GenerateShort { spec } => {
                                    println!("Generating short: {:?}", spec);
                                    Ok(Value::String("ok".into()))
                                }
                            };
                            {
                                let mut map = tasks_clone.lock().unwrap();
                                if let Some(t) = map.get_mut(&id) {
                                    match res {
                                        Ok(v) => {
                                            t.status = TaskStatus::Completed;
                                            t.progress = 1.0;
                                            t.result = Some(v);
                                        }
                                        Err(e) => {
                                            t.status = TaskStatus::Failed(e);
                                        }
                                    }
                                }
                            }
                            drop(permit);
                        });
                        handles_worker.lock().unwrap().insert(id, handle);
                    }
                    Message::Cancel(id) => {
                        cancelled_worker.lock().unwrap().insert(id);
                        if let Some(handle) = handles_worker.lock().unwrap().remove(&id) {
                            handle.abort();
                        }
                        if let Some(t) = tasks_worker.lock().unwrap().get_mut(&id) {
                            t.status = TaskStatus::Cancelled;
                        }
                    }
                }
            }
        });
        Self {
            tx,
            tasks,
            handles,
            cancelled,
            limits,
        }
    }

    pub async fn enqueue(&self, label: String, command: TaskCommand) -> u64 {
        static NEXT_ID: AtomicU64 = AtomicU64::new(1);
        let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
        let task = Task {
            id,
            label,
            command,
            status: TaskStatus::Queued,
            progress: 0.0,
            result: None,
        };
        let _ = self.tx.send(Message::Enqueue(task)).await;
        id
    }

    pub fn get(&self, id: u64) -> Option<Task> {
        self.tasks.lock().unwrap().get(&id).cloned()
    }

    pub fn list(&self) -> Vec<Task> {
        self.tasks.lock().unwrap().values().cloned().collect()
    }

    pub async fn cancel(&self, id: u64) -> bool {
        self.tx.send(Message::Cancel(id)).await.is_ok()
    }

    pub fn set_limits(&self, cpu: f32, memory: f32) {
        let mut l = self.limits.lock().unwrap();
        l.cpu = cpu;
        l.memory = memory;
    }
}
