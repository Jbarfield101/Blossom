import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Button, Snackbar, Alert, LinearProgress } from "@mui/material";
import { useTasks } from "../../store/tasks";
import { useNPCs } from "../../store/npcs";
import type { NpcData } from "./types";

interface Props {
  world: string;
}

export default function NpcPdfUpload({ world }: Props) {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const loadNPCs = useNPCs((s) => s.loadNPCs);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const id = await enqueueTask("Import NPC PDF", {
        ParseNpcPdf: { path: selected, world },
      });
      setTaskId(id);
      setStatus("uploading");
      setSnackbarOpen(true);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    const task = tasks[taskId];
    if (task && task.status === "completed" && Array.isArray(task.result)) {
      const parsed = task.result as NpcData[];
      (async () => {
        const existing = await invoke<NpcData[]>("list_npcs", { world });
        for (const npc of parsed) {
          const dup = existing.find(
            (e) => e.id === npc.id || e.name === npc.name
          );
          let overwrite = true;
          if (dup) {
            overwrite = window.confirm(`NPC ${npc.name} exists. Overwrite?`);
          }
          if (overwrite) {
            await invoke("save_npc", { world, npc, overwrite });
          }
        }
        await loadNPCs();
        setStatus("completed");
        setSnackbarOpen(true);
        setTaskId(null);
      })();
    }
  }, [taskId, tasks, world, loadNPCs]);

  const task = taskId ? tasks[taskId] : null;

  function handleSnackbarClose() {
    setSnackbarOpen(false);
    if (status === "completed") setStatus("idle");
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!world || status === "uploading"}
        variant="contained"
      >
        Upload NPC PDF
      </Button>
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
          severity={status === "completed" ? "success" : "info"}
          sx={{ width: "100%" }}
        >
          {status === "completed"
            ? "NPCs imported successfully!"
            : "Uploading NPC PDF..."}
        </Alert>
      </Snackbar>
    </div>
  );
}
