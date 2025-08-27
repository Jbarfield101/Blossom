import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useTasks } from "../../store/tasks";
import type { LoreData } from "./types";

interface Props {
  world: string;
}

export default function LorePdfUpload({ world }: Props) {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const id = await enqueueTask("Import Lore PDF", {
        id: "ParseLorePdf",
        path: selected,
        world,
      });
      setTaskId(id);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    const task = tasks[taskId];
    if (task && task.status === "completed" && Array.isArray(task.result)) {
      const parsed = task.result as LoreData[];
      (async () => {
        const existing = await invoke<LoreData[]>("list_lore", { world });
        for (const lore of parsed) {
          const dup = existing.find(
            (e) => e.id === lore.id || e.name === lore.name
          );
          let overwrite = true;
          if (dup) {
            overwrite = window.confirm(`Lore ${lore.name} exists. Overwrite?`);
          }
          if (overwrite) {
            await invoke("save_lore", { world, lore, overwrite });
          }
        }
      })();
    }
  }, [taskId, tasks, world]);

  return (
    <div>
      <button type="button" onClick={handleUpload} disabled={!world}>
        Upload Lore PDF
      </button>
    </div>
  );
}

