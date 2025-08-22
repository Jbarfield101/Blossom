import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface SpellRecord {
  name: string;
  description: string;
}

interface ParsedSpell extends SpellRecord {
  origin: "official" | "custom";
}

const OFFICIAL_SPELLS = new Set([
  "Fireball",
  "Magic Missile",
  "Cure Wounds",
]);

export default function SpellPdfUpload() {
  const [spells, setSpells] = useState<ParsedSpell[]>([]);

  async function handleUpload() {
    const selected = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected === "string") {
      const extracted = await invoke<SpellRecord[]>("parse_spell_pdf", { path: selected });
      const classified = extracted.map((s) => ({
        ...s,
        origin: OFFICIAL_SPELLS.has(s.name) ? "official" : "custom",
      }));
      setSpells(classified);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleUpload}>
        Upload Spell PDF
      </button>
      {spells.length > 0 && (
        <ul>
          {spells.map((s) => (
            <li key={s.name}>
              {s.name} – {s.origin}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
