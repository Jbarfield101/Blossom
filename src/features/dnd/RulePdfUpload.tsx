import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface RuleRecord {
  name: string;
  description: string;
}

interface ParsedRule extends RuleRecord {
  origin: "official" | "custom";
}

const OFFICIAL_RULES = new Set([
  "Ability Checks",
  "Advantage and Disadvantage",
  "Critical Hits",
  "Saving Throws",
]);

export default function RulePdfUpload() {
  const [rules, setRules] = useState<ParsedRule[]>([]);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const extracted = await invoke<RuleRecord[]>("parse_rule_pdf", { path: selected });
      const classified = extracted.map((r) => ({
        ...r,
        origin: OFFICIAL_RULES.has(r.name) ? "official" : "custom",
      }));
      setRules(classified);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleUpload}>
        Upload Rule PDF
      </button>
      {rules.length > 0 && (
        <ul>
          {rules.map((r) => (
            <li key={r.name}>
              {r.name} – {r.origin}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

