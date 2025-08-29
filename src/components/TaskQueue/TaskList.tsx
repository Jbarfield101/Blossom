import { useEffect, useState, useRef } from "react";
import { Box, Button, LinearProgress, Typography, Snackbar, Alert } from "@mui/material";
import { useTasks, TaskStatus } from "../../store/tasks";
import { useSystemInfo } from "../../features/system/useSystemInfo";

export default function TaskList() {
  const { tasks, cancelTask, subscribe } = useTasks();
  const info = useSystemInfo();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<
    { message: string; severity: "success" | "error" } | null
  >(null);
  const seen = useRef<Record<number, TaskStatus>>({});

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        unlisten = await subscribe();
      } catch (err) {
        console.error("Failed to subscribe", err);
        setError("Failed to subscribe to task updates");
        unlisten?.();
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [subscribe]);

  const entries = Object.values(tasks);

  useEffect(() => {
    entries.forEach((task) => {
      const prev = seen.current[task.id];
      if (task.status !== prev && (task.status === "completed" || task.status === "failed")) {
        if (task.status === "completed") {
          const result = task.result as any;
          const message =
            result?.message ||
            (typeof result === "string" ? result : null) ||
            (result?.path ? `Saved to ${result.path}` : null) ||
            `${task.label} completed`;
          setToast({
            message,
            severity: "success",
          });
        } else {
          setToast({
            message: task.error || `${task.label} failed`,
            severity: "error",
          });
        }
      }
      seen.current[task.id] = task.status;
    });
  }, [entries]);

  const cpuWarn = info && info.cpu_usage > 80;
  const memWarn = info && info.mem_usage > 80;

  const subscribeError = (
    <Snackbar
      open={!!error}
      autoHideDuration={6000}
      onClose={() => setError(null)}
    >
      <Alert onClose={() => setError(null)} severity="error" sx={{ width: "100%" }}>
        {error}
      </Alert>
    </Snackbar>
  );

  const taskSnackbar = (
    <Snackbar
      open={!!toast}
      autoHideDuration={6000}
      onClose={() => setToast(null)}
    >
      <Alert
        onClose={() => setToast(null)}
        severity={toast?.severity || "success"}
        sx={{ width: "100%" }}
      >
        {toast?.message}
      </Alert>
    </Snackbar>
  );

  if (entries.length === 0 && !info)
    return (
      <>
        {subscribeError}
        {taskSnackbar}
      </>
    );

  return (
    <>
      <Box sx={{ mt: 2, p: 2, border: "1px solid #ccc", borderRadius: 1 }}>
        {info && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 1,
              color: cpuWarn || memWarn ? "error.main" : "text.primary",
            }}
          >
            CPU {Math.round(info.cpu_usage)}% · Mem {Math.round(info.mem_usage)}%
          </Typography>
        )}
      {entries.length === 0 ? (
        <Typography variant="body2">No active tasks</Typography>
      ) : (
        entries.map((task) => (
          <Box key={task.id} sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {task.label}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, task.progress * 100))}
                sx={{ my: 0.5, flexGrow: 1, mr: 1 }}
              />
              {task.started_at && (
                <Typography variant="caption" sx={{ minWidth: 48, textAlign: "right" }}>
                  {formatElapsed(task.started_at)}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption">{task.status}</Typography>
              {task.status === "queued" || task.status === "running" ? (
                <Button size="small" onClick={() => cancelTask(task.id)}>
                  Cancel
                </Button>
              ) : null}
            </Box>
          </Box>
        ))
      )}
      </Box>
      {subscribeError}
      {taskSnackbar}
    </>
  );
}

function formatElapsed(started_at: string) {
  const diff = Date.now() - new Date(started_at).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

