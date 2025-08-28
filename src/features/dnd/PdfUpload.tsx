import { useEffect, useState, ReactNode } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, Snackbar, Alert, LinearProgress } from "@mui/material";
import { useTasks } from "../../store/tasks";
import type { Task, TaskCommand } from "../../store/tasks";

interface PdfUploadProps<R = unknown> {
  /** Button label */
  label: string;
  /** Task label for enqueueTask */
  taskLabel: string;
  /** Command id for parsing */
  parseTask: TaskCommand["id"];
  /** Optional world context */
  world?: string;
  /** Additional fields for task command */
  commandExtras?: Record<string, unknown>;
  /** Optional log component to toggle */
  logComponent?: ReactNode;
  /** Called with parsed result when task completes */
  onParsed?: (result: R) => Promise<void> | void;
  /** Called when task fails */
  onError?: (errorCode: string | null, error: string | null) => Promise<void> | void;
  /** Custom success message */
  getSuccessMessage?: (result: R) => string;
}

export default function PdfUpload<R = unknown>({
  label,
  taskLabel,
  parseTask,
  world,
  commandExtras,
  logComponent,
  onParsed,
  onError,
  getSuccessMessage,
}: PdfUploadProps<R>) {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "completed" | "failed">("idle");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [result, setResult] = useState<R | null>(null);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const command: Record<string, unknown> = { id: parseTask, path: selected };
      if (world) command.world = world;
      if (commandExtras) Object.assign(command, commandExtras);
      const id = await enqueueTask(taskLabel, command as any);
      setTaskId(id);
      setStatus("uploading");
      setSnackbarOpen(true);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    const task = tasks[taskId];
    if (task && task.status === "completed") {
      const res = task.result as R;
      setResult(res);
      onParsed?.(res);
      setStatus("completed");
      setSnackbarOpen(true);
      setTaskId(null);
      if (logComponent) setShowLog(true);
    } else if (task && task.status === "failed") {
      setError(task.error ?? null);
      setErrorCode(task.errorCode ?? null);
      onError?.(task.errorCode ?? null, task.error ?? null);
      setStatus("failed");
      setSnackbarOpen(true);
      setTaskId(null);
      if (logComponent) setShowLog(true);
    }
  }, [taskId, tasks, onParsed, onError, logComponent]);

  const task: Task | null = taskId ? tasks[taskId] : null;

  function handleSnackbarClose() {
    setSnackbarOpen(false);
    if (status === "completed" || status === "failed") setStatus("idle");
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleUpload}
        disabled={
          status === "uploading" || (typeof world !== "undefined" && !world)
        }
        variant="contained"
        size="large"
        sx={{
          px: 4,
          py: 1.5,
          fontWeight: "bold",
          "&:hover,&:focus": { boxShadow: "0 0 8px #0f0" },
        }}
      >
        {label}
      </Button>
      {logComponent && (
        <Button
          type="button"
          onClick={() => setShowLog((s) => !s)}
          sx={{ ml: 2 }}
          size="small"
        >
          {showLog ? "Hide Log" : "View Log"}
        </Button>
      )}
      {task && task.status === "running" && (
        <LinearProgress
          variant="determinate"
          value={task.progress * 100}
          sx={{ mt: 2 }}
        />
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={status === "completed" ? 4000 : undefined}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={
            status === "completed" ? "success" : status === "failed" ? "error" : "info"
          }
          sx={{ width: "100%" }}
        >
          {status === "completed"
            ? getSuccessMessage?.(result as R) ?? "PDF imported successfully"
            : status === "failed"
            ? `Failed to import PDF (${errorCode ?? "unknown"}): ${error ?? ""}`
            : "Uploading PDF..."}
        </Alert>
      </Snackbar>
      {showLog && logComponent}
    </div>
  );
}

