import { invoke } from "@tauri-apps/api/core";
import PdfUpload from "./PdfUpload";
import type { SpellData } from "./types";

export default function SpellPdfUpload() {
  async function handleParsed(spells: SpellData[]) {
    const existing = await invoke<SpellData[]>("list_spells");
    for (const spell of spells) {
      const dup = existing.find((e) => e.id === spell.id || e.name === spell.name);
      let overwrite = true;
      if (dup) {
        overwrite = window.confirm(`Spell ${spell.name} exists. Overwrite?`);
      }
      if (overwrite) {
        await invoke("save_spell", { spell, overwrite });
      }
    }
  }

  return (
    <PdfUpload<SpellData[]>
      label="Upload Spell PDF"
      taskLabel="Import Spell PDF"
      parseTask="ParseSpellPdf"
      onParsed={handleParsed}
      getSuccessMessage={() => "Spells imported successfully"}
    />
  );
}

