use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader};
use std::process::{Command as PCommand, Output, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sysinfo::System;
use tauri::async_runtime::{self, JoinHandle};
use tauri::{AppHandle, Emitter, Wry};
use tokio::sync::{mpsc, Mutex, Semaphore};
use tokio::time::sleep;

use crate::video_tools::ShortSpec;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "id")]
pub enum TaskCommand {
    /// Placeholder variant for future expansion.
    Example,
    PdfIngest {
        py: String,
        script: String,
        doc_id: String,
    },
    ParseSpellPdf {
        #[serde(default = "crate::python_helpers::conda_python_string")]
        py: String,
        #[serde(default = "crate::commands::pdf_tools_path_string")]
        script: String,
        path: String,
    },
    ParseRulePdf {
        #[serde(default = "crate::python_helpers::conda_python_string")]
        py: String,
        #[serde(default = "crate::commands::pdf_tools_path_string")]
        script: String,
        path: String,
    },
    ParseLorePdf {
        #[serde(default = "crate::python_helpers::conda_python_string")]
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
pub enum PdfErrorCode {
    PythonNotFound,
    ExecutionFailed,
    InvalidJson,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskError {
    pub code: PdfErrorCode,
    pub message: String,
}

impl From<String> for TaskError {
    fn from(message: String) -> Self {
        TaskError {
            code: PdfErrorCode::Unknown,
            message,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed { code: PdfErrorCode, message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: u64,
    pub label: String,
    pub command: TaskCommand,
    pub status: TaskStatus,
    pub progress: f32,
    pub result: Option<Value>,
    pub started_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
struct TaskUpdatePayload {
    task: Task,
    #[serde(skip_serializing_if = "Option::is_none")]
    progress: Option<Value>,
}

fn parse_python_json(output: Output) -> Result<Value, TaskError> {
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(TaskError {
            code: PdfErrorCode::ExecutionFailed,
            message: format!("Python exited with status {}:\n{}", output.status, stderr),
        })
    } else {
        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str::<Value>(&stdout).map_err(|e| TaskError {
            code: PdfErrorCode::InvalidJson,
            message: e.to_string(),
        })
    }
}

enum Message {
    Enqueue(Task),
    Cancel(u64),
}

pub struct TaskQueue {
    tx: mpsc::Sender<Message>,
    tasks: Arc<Mutex<HashMap<u64, Task>>>,
    _handles: Arc<Mutex<HashMap<u64, JoinHandle<Result<Value, TaskError>>>>>,
    _cancelled: Arc<Mutex<HashSet<u64>>>,
    limits: Arc<Mutex<ResourceLimits>>,
    app: Arc<StdMutex<Option<AppHandle<Wry>>>>,
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
        let _handles = Arc::new(Mutex::new(HashMap::new()));
        let _cancelled = Arc::new(Mutex::new(HashSet::new()));
        let limits = Arc::new(Mutex::new(ResourceLimits {
            cpu: cpu_limit,
            memory: memory_limit,
        }));
        let app: Arc<StdMutex<Option<AppHandle<Wry>>>> =
            Arc::new(StdMutex::new(None::<AppHandle<Wry>>));
        let tasks_worker = tasks.clone();
        let _handles_worker = _handles.clone();
        let _cancelled_worker = _cancelled.clone();
        let limits_worker = limits.clone();
        let app_worker = app.clone();
        async_runtime::spawn(async move {
            let semaphore = Arc::new(Semaphore::new(concurrency));
            while let Some(msg) = rx.recv().await {
                match msg {
                    Message::Enqueue(task) => {
                        {
                            let mut map = tasks_worker.lock().await;
                            map.insert(task.id, task.clone());
                        }
                        if _cancelled_worker.lock().await.contains(&task.id) {
                            if let Some(t) = tasks_worker.lock().await.get_mut(&task.id) {
                                t.status = TaskStatus::Cancelled;
                            }
                            continue;
                        }
                        let tasks_clone = tasks_worker.clone();
                        let limits_clone = limits_worker.clone();
                        let _cancelled_clone = _cancelled_worker.clone();
                        let command = task.command.clone();
                        let app_handle = app_worker.clone();
                        let permit = semaphore.clone().acquire_owned().await.unwrap();
                        let id = task.id;
                        let handle = async_runtime::spawn(async move {
                            let mut sys = System::new();
                            loop {
                                let (cpu_limit, mem_limit) = {
                                    let l = limits_clone.lock().await;
                                    (l.cpu, l.memory)
                                };
                                sys.refresh_cpu_usage();
                                tokio::time::sleep(Duration::from_millis(100)).await;
                                sys.refresh_cpu_usage();
                                sys.refresh_memory();
                                let cpu_usage = sys.global_cpu_usage();
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
                            let snapshot = {
                                let mut map = tasks_clone.lock().await;
                                if let Some(t) = map.get_mut(&id) {
                                    t.status = TaskStatus::Running;
                                    t.started_at = Some(Utc::now());
                                    Some(t.clone())
                                } else {
                                    None
                                }
                            };
                            if let Some(task) = snapshot {
                                if let Some(app) = app_handle.lock().unwrap().clone() {
                                    let _ = app.emit(
                                        "task_updated",
                                        TaskUpdatePayload {
                                            task,
                                            progress: None,
                                        },
                                    );
                                }
                            }
                            let res: Result<Value, TaskError> = match command {
                                TaskCommand::Example => Ok(Value::Null),
                                TaskCommand::PdfIngest { py, script, doc_id } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("ingest")
                                        .arg(&doc_id)
                                        .output()
                                        .map_err(|e| TaskError {
                                            code: PdfErrorCode::PythonNotFound,
                                            message: format!("Failed to start python: {e}"),
                                        })?;
                                    if !output.status.success() {
                                        let stderr = String::from_utf8_lossy(&output.stderr);
                                        Err(TaskError {
                                            code: PdfErrorCode::ExecutionFailed,
                                            message: format!(
                                                "Python exited with status {}:\n{}",
                                                output.status, stderr
                                            ),
                                        })
                                    } else {
                                        let stdout =
                                            String::from_utf8_lossy(&output.stdout).to_string();
                                        log::info!("PdfIngest stdout: {}", stdout.trim());
                                        serde_json::from_str::<Value>(&stdout).map_err(|e| {
                                            TaskError {
                                                code: PdfErrorCode::InvalidJson,
                                                message: e.to_string(),
                                            }
                                        })
                                    }
                                }
                                TaskCommand::ParseSpellPdf { py, script, path } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("spells")
                                        .arg(&path)
                                        .output()
                                        .map_err(|e| TaskError {
                                            code: PdfErrorCode::PythonNotFound,
                                            message: format!("Failed to start python: {e}"),
                                        })?;
                                    parse_python_json(output)
                                }
                                TaskCommand::ParseRulePdf { py, script, path } => {
                                    let output = PCommand::new(&py)
                                        .arg(&script)
                                        .arg("rules")
                                        .arg(&path)
                                        .output()
                                        .map_err(|e| TaskError {
                                            code: PdfErrorCode::PythonNotFound,
                                            message: format!("Failed to start python: {e}"),
                                        })?;
                                    parse_python_json(output)
                                }
                                TaskCommand::ParseLorePdf {
                                    py,
                                    script,
                                    path,
                                    world: _,
                                } => {
                                    let mut cmd = PCommand::new(&py);
                                    cmd.arg(&script)
                                        .arg("lore")
                                        .arg(&path)
                                        .stdout(Stdio::piped())
                                        .stderr(Stdio::piped());
                                    let mut child = cmd.spawn().map_err(|e| TaskError {
                                        code: PdfErrorCode::PythonNotFound,
                                        message: format!("Failed to start python: {e}"),
                                    })?;
                                    let stdout = child.stdout.take().ok_or_else(|| TaskError {
                                        code: PdfErrorCode::ExecutionFailed,
                                        message: "no stdout".to_string(),
                                    })?;
                                    let mut reader = BufReader::new(stdout);
                                    let mut output = String::new();
                                    loop {
                                        let mut line = String::new();
                                        let n =
                                            reader.read_line(&mut line).map_err(|e| TaskError {
                                                code: PdfErrorCode::Unknown,
                                                message: e.to_string(),
                                            })?;
                                        if n == 0 {
                                            break;
                                        }
                                        if let Ok(v) = serde_json::from_str::<Value>(line.trim()) {
                                            if let Some(p) =
                                                v.get("progress").and_then(|p| p.as_f64())
                                            {
                                                let mut map = tasks_clone.lock().await;
                                                if let Some(t) = map.get_mut(&id) {
                                                    t.progress = p as f32;
                                                    let update = TaskUpdatePayload {
                                                        task: t.clone(),
                                                        progress: Some(v.clone()),
                                                    };
                                                    drop(map);
                                                    if let Some(app) =
                                                        app_handle.lock().unwrap().clone()
                                                    {
                                                        let _ = app.emit("task_updated", update);
                                                    }
                                                }
                                            } else {
                                                output.push_str(&line);
                                            }
                                        } else {
                                            output.push_str(&line);
                                        }
                                        if _cancelled_clone.lock().await.contains(&id) {
                                            let _ = child.kill();
                                            return Err(TaskError {
                                                code: PdfErrorCode::Unknown,
                                                message: "cancelled".into(),
                                            });
                                        }
                                    }
                                    let status = child.wait().map_err(|e| TaskError {
                                        code: PdfErrorCode::Unknown,
                                        message: e.to_string(),
                                    })?;
                                    if !status.success() {
                                        let mut err = String::new();
                                        if let Some(mut e) = child.stderr.take() {
                                            use std::io::Read;
                                            let _ = e.read_to_string(&mut err);
                                        }
                                        Err(TaskError {
                                            code: PdfErrorCode::ExecutionFailed,
                                            message: format!(
                                                "Python exited with status {}:\n{}",
                                                status, err
                                            ),
                                        })
                                    } else {
                                        serde_json::from_str::<Value>(&output).map_err(|e| {
                                            TaskError {
                                                code: PdfErrorCode::InvalidJson,
                                                message: e.to_string(),
                                            }
                                        })
                                    }
                                }
                                TaskCommand::GenerateShort { spec } => {
                                    println!("Generating short: {:?}", spec);
                                    Ok(Value::String("ok".into()))
                                }
                            };
                            let snapshot = {
                                let mut map = tasks_clone.lock().await;
                                if let Some(t) = map.get_mut(&id) {
                                    match &res {
                                        Ok(v) => {
                                            t.status = TaskStatus::Completed;
                                            t.progress = 1.0;
                                            t.result = Some(v.clone());
                                        }
                                        Err(e) => {
                                            t.status = TaskStatus::Failed {
                                                code: e.code.clone(),
                                                message: e.message.clone(),
                                            };
                                        }
                                    }
                                    Some(t.clone())
                                } else {
                                    None
                                }
                            };
                            if let Some(task) = snapshot {
                                if let Some(app) = app_handle.lock().unwrap().clone() {
                                    let _ = app.emit(
                                        "task_updated",
                                        TaskUpdatePayload {
                                            task,
                                            progress: None,
                                        },
                                    );
                                }
                            }
                            drop(permit);
                            res
                        });
                        _handles_worker.lock().await.insert(id, handle);
                    }
                    Message::Cancel(id) => {
                        _cancelled_worker.lock().await.insert(id);
                        if let Some(handle) = _handles_worker.lock().await.remove(&id) {
                            handle.abort();
                        }
                        if let Some(t) = tasks_worker.lock().await.get_mut(&id) {
                            t.status = TaskStatus::Cancelled;
                        }
                    }
                }
            }
        });
        Self {
            tx,
            tasks,
            _handles,
            _cancelled,
            limits,
            app,
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
            started_at: Some(Utc::now()),
        };
        let _ = self.tx.send(Message::Enqueue(task)).await;
        id
    }

    pub async fn get(&self, id: u64) -> Option<Task> {
        self.tasks.lock().await.get(&id).cloned()
    }

    pub async fn list(&self) -> Vec<Task> {
        self.tasks.lock().await.values().cloned().collect()
    }

    pub async fn cancel(&self, id: u64) -> bool {
        self.tx.send(Message::Cancel(id)).await.is_ok()
    }

    pub async fn set_limits(&self, cpu: f32, memory: f32) {
        let mut l = self.limits.lock().await;
        l.cpu = cpu;
        l.memory = memory;
    }

    pub fn set_app_handle(&self, handle: AppHandle<Wry>) {
        let mut h = self.app.lock().unwrap();
        *h = Some(handle);
    }
}
