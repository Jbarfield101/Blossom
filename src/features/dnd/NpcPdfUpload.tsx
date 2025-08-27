import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Button, Snackbar, Alert, LinearProgress } from "@mui/material";
import { useTasks } from "../../store/tasks";
import { useNPCs } from "../../store/npcs";
import type { NpcData } from "./types";
import NpcLog from "./NpcLog";

interface Props {
  world: string;
  onParsed?: (npc: NpcData) => void;
}

export default function NpcPdfUpload({ world, onParsed }: Props) {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const loadNPCs = useNPCs((s) => s.loadNPCs);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "completed" | "failed">(
    "idle"
  );
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [importedNpc, setImportedNpc] = useState<NpcData | null>(null);

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
      setImportedNpc(parsed[0] ?? null);
      if (parsed[0]) onParsed?.(parsed[0]);
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
            await invoke("append_npc_log", {
              world,
              id: npc.id,
              name: npc.name,
            });
          }
        }
        await loadNPCs();
        setStatus("completed");
        setSnackbarOpen(true);
        setTaskId(null);
        setShowLog(true);
      })();
    } else if (task && task.status === "failed") {
      (async () => {
        await invoke("append_npc_log", {
          world,
          id: "",
          name: "",
          errorCode: task.errorCode ?? null,
          message: task.error ?? null,
        });
      })();
      setImportedNpc(null);
      setStatus("failed");
      setError(task.error ?? null);
      setErrorCode(task.errorCode ?? null);
      setSnackbarOpen(true);
      setTaskId(null);
      setShowLog(true);
    }
  }, [taskId, tasks, world, loadNPCs, onParsed]);

  const task = taskId ? tasks[taskId] : null;

  function handleSnackbarClose() {
    setSnackbarOpen(false);
    if (status === "completed" || status === "failed") setStatus("idle");
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!world || status === "uploading"}
        variant="contained"
        size="large"
        sx={{
          px: 4,
          py: 1.5,
          fontWeight: "bold",
          "&:hover,&:focus": { boxShadow: "0 0 8px #0f0" },
        }}
      >
        Upload NPC PDF
      </Button>
      <Button
        type="button"
        onClick={() => setShowLog((s) => !s)}
        sx={{ ml: 2 }}
        size="small"
      >
        {showLog ? "Hide Log" : "View Log"}
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
          severity={
            status === "completed" ? "success" : status === "failed" ? "error" : "info"
          }
          sx={{ width: "100%" }}
        >
          {status === "completed"
            ? importedNpc
              ? `Imported NPC: ${importedNpc.name}`
              : "NPCs imported successfully!"
            : status === "failed"
            ? `Failed to import NPC PDF (${errorCode ?? "unknown"}): ${
                error ?? ""
              }`
            : "Uploading NPC PDF..."}
        </Alert>
      </Snackbar>
      {showLog && <NpcLog />}
    </div>
  );
}
