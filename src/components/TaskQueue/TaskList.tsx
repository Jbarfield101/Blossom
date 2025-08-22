import { useEffect } from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { useTasks } from "../../store/tasks";
import { useSystemInfo } from "../../features/system/useSystemInfo";

export default function TaskList() {
  const { tasks, cancelTask, subscribe } = useTasks();
  const info = useSystemInfo();

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    subscribe().then((u) => {
      unlisten = u;
    });
    return () => {
      unlisten?.();
    };
  }, [subscribe]);

  const entries = Object.values(tasks);

  const cpuWarn = info && info.cpu_usage > 80;
  const memWarn = info && info.mem_usage > 80;

  if (entries.length === 0 && !info) return null;

  return (
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
            <LinearProgress
              variant="determinate"
              value={task.progress}
              sx={{ my: 0.5 }}
            />
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
  );
}

