import { invoke } from "@tauri-apps/api/core";
import { useNPCs } from "../../store/npcs";
import PdfUpload from "./PdfUpload";
import type { NpcData } from "./types";
import NpcLog from "./NpcLog";

interface Props {
  world: string;
  onParsed?: (npcs: NpcData[]) => void;
}

export default function NpcPdfUpload({ world, onParsed }: Props) {
  const loadNPCs = useNPCs((s) => s.loadNPCs);

  async function handleParsed(res: { npcs: NpcData[] }) {
    const parsed = res.npcs;
    onParsed?.(parsed);
    const existing = await invoke<NpcData[]>("list_npcs", { world });
    for (const npc of parsed) {
      const dup = existing.find((e) => e.id === npc.id || e.name === npc.name);
      let overwrite = true;
      if (dup) {
        overwrite = window.confirm(`NPC ${npc.name} exists. Overwrite?`);
      }
      if (overwrite) {
        await invoke("save_npc", { world, npc, overwrite });
        await invoke("append_npc_log", { world, id: npc.id, name: npc.name });
      }
    }
    await loadNPCs(world);
  }

  async function handleError(errorCode: string | null, error: string | null) {
    await invoke("append_npc_log", {
      world,
      id: "",
      name: "",
      errorCode: errorCode ?? null,
      message: error ?? null,
    });
  }

  const successMessage = (res: { npcs: NpcData[] }) =>
    `NPCs imported successfully: ${res.npcs.map((n) => n.name).join(", ")}`;

  return (
    <PdfUpload<{ npcs: NpcData[] }>
      label="Upload NPC PDF"
      taskLabel="Import NPC PDF"
      parseTask="ParseNpcPdf"
      world={world}
      logComponent={<NpcLog />}
      onParsed={handleParsed}
      onError={handleError}
      getSuccessMessage={successMessage}
    />
  );
}

