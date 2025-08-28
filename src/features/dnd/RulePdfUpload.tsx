import { invoke } from "@tauri-apps/api/core";
import PdfUpload from "./PdfUpload";
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
  async function handleParsed(res: { rules: RuleRecord[] }) {
    const raw = res.rules;
    const parsed: RuleData[] = raw.map((r) => ({
      id: `rule_${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: r.name,
      description: r.description,
      tags: OFFICIAL_RULES.has(r.name) ? ["core"] : ["custom"],
    }));
    const existing = await invoke<RuleIndexEntry[]>("list_rules");
    for (const rule of parsed) {
      const dup = existing.find((e) => e.id === rule.id || e.name === rule.name);
      let overwrite = true;
      if (dup) {
        overwrite = window.confirm(`Rule ${rule.name} exists. Overwrite?`);
      }
      if (overwrite) {
        await invoke("save_rule", { rule, overwrite });
      }
    }
  }

  return (
    <PdfUpload<{ rules: RuleRecord[] }>
      label="Upload Rule PDF"
      taskLabel="Import Rule PDF"
      parseTask="ParseRulePdf"
      onParsed={handleParsed}
      getSuccessMessage={() => "Rules imported successfully"}
    />
  );
}

