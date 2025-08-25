import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useTasks } from "../../store/tasks";
import type { RuleData } from "./types";

interface RuleRecord {
  name: string;
  description: string;
}

interface RuleIndexEntry {
  id: string;
  name: string;
}

const OFFICIAL_RULES = new Set([
  "Ability Checks",
  "Advantage and Disadvantage",
  "Critical Hits",
  "Saving Throws",
]);

export default function RulePdfUpload() {
  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);

  async function handleUpload() {
    const selected = await open({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof selected === "string") {
      const id = await enqueueTask("Import Rule PDF", {
        ParseRulePdf: { path: selected },
      });
      setTaskId(id);
    }
  }

  useEffect(() => {
    if (!taskId) return;
    const task = tasks[taskId];
    if (
      task &&
      task.status === "completed" &&
      task.result &&
      Array.isArray((task.result as any).rules)
    ) {
      const raw = (task.result as any).rules as RuleRecord[];
      const parsed: RuleData[] = raw.map((r) => ({
        id: `rule_${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: r.name,
        description: r.description,
        tags: OFFICIAL_RULES.has(r.name) ? ["core"] : ["custom"],
      }));
      (async () => {
        const existing = await invoke<RuleIndexEntry[]>("list_rules");
        for (const rule of parsed) {
          const dup = existing.find(
            (e) => e.id === rule.id || e.name === rule.name,
          );
          let overwrite = true;
          if (dup) {
            overwrite = window.confirm(`Rule ${rule.name} exists. Overwrite?`);
          }
          if (overwrite) {
            await invoke("save_rule", { rule, overwrite });
          }
        }
      })();
    } else if (task && task.status === "failed") {
      const message = (task.error as any)?.message ?? String(task.error ?? "");
      window.alert(`Failed to import Rule PDF: ${message}`);
      setTaskId(null);
    }
  }, [taskId, tasks]);

  return (
    <div>
      <button type="button" onClick={handleUpload}>
        Upload Rule PDF
      </button>
    </div>
  );
}
