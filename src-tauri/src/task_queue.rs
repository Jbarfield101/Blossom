use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};

use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc, Semaphore};
use tauri::async_runtime::{self, JoinHandle};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskCommand {
    /// Placeholder variant for future expansion.
    Example,
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
}

impl TaskQueue {
    pub fn new(concurrency: usize) -> Self {
        let (tx, mut rx) = mpsc::channel(100);
        let tasks = Arc::new(Mutex::new(HashMap::new()));
        let handles = Arc::new(Mutex::new(HashMap::new()));
        let cancelled = Arc::new(Mutex::new(HashSet::new()));
        let tasks_worker = tasks.clone();
        let handles_worker = handles.clone();
        let cancelled_worker = cancelled.clone();
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
                        let permit = semaphore.clone().acquire_owned().await.unwrap();
                        let id = task.id;
                        let handle = async_runtime::spawn(async move {
                            {
                                let mut map = tasks_clone.lock().unwrap();
                                if let Some(t) = map.get_mut(&id) {
                                    t.status = TaskStatus::Running;
                                }
                            }
                            {
                                let mut map = tasks_clone.lock().unwrap();
                                if let Some(t) = map.get_mut(&id) {
                                    t.status = TaskStatus::Completed;
                                    t.progress = 1.0;
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
        Self { tx, tasks, handles, cancelled }
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
}

