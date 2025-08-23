import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useTasks } from "../../store/tasks";
import type { NpcData } from "./types";

interface Props {
  world: string;
}

export default function NpcPdfUpload({ world }: Props) {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const id = await enqueueTask("Import NPC PDF", {
        ParseNpcPdf: { path: selected, world },
      });
      setTaskId(id);
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
      })();
    }
  }, [taskId, tasks, world]);

  return (
    <div>
      <button type="button" onClick={handleUpload} disabled={!world}>
        Upload NPC PDF
      </button>
    </div>
  );
}
