import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useTasks } from "../../store/tasks";
import type { SpellData } from "./types";

interface SpellIndexEntry {
  id: string;
  name: string;
}

export default function SpellPdfUpload() {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const id = await enqueueTask("Import Spell PDF", {
        ParseSpellPdf: { path: selected },
      });
      setTaskId(id);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    const task = tasks[taskId];
    if (task && task.status === "completed" && Array.isArray(task.result)) {
      const parsed = task.result as SpellData[];
      (async () => {
        const existing = await invoke<SpellIndexEntry[]>("list_spells");
        for (const spell of parsed) {
          const dup = existing.find((e) => e.id === spell.id || e.name === spell.name);
          let overwrite = true;
          if (dup) {
            overwrite = window.confirm(`Spell ${spell.name} exists. Overwrite?`);
          }
          if (overwrite) {
            await invoke("save_spell", { spell, overwrite });
          }
        }
      })();
    }
  }, [taskId, tasks]);

  return (
    <div>
      <button type="button" onClick={handleUpload}>
        Upload Spell PDF
      </button>
    </div>
  );
}

