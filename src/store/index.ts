import { saveState, loadState } from "../utils/persist";
import { useNPCs } from "./npcs";
import { useWorlds } from "./worlds";
import { useCharacter } from "./character";
import { useEncounterStore } from "./encounter";
import { useWarTableStore } from "./warTable";
import { useTabletopStore } from "./tabletop";
import { useVoices } from "./voices";
import { useInventory } from "./inventory";

// Export individual stores for existing imports elsewhere
export {
  useNPCs,
  useWorlds,
  useCharacter,
  useEncounterStore,
  useWarTableStore,
  useTabletopStore,
  useVoices,
  useInventory,
};

const slices = {
  npcs: useNPCs,
  worlds: useWorlds,
  character: useCharacter,
  encounter: useEncounterStore,
  warTable: useWarTableStore,
  tabletop: useTabletopStore,
  inventory: useInventory,
};

type StoreState<T> = {
  [K in keyof T]: T[K] extends { getState: () => infer S }
    ? { [P in keyof S as S[P] extends Function ? never : P]: S[P] }
    : never;
};

export type CampaignState = StoreState<typeof slices>;

export async function saveCampaign(
  key = "campaign",
  backendUrl?: string
) {
  const data: Record<string, unknown> = {};
  for (const [name, store] of Object.entries(slices)) {
    const state = store.getState();
    data[name] = JSON.parse(JSON.stringify(state));
  }
  await saveState(key, data, backendUrl);
}

export async function loadCampaign(
  key = "campaign",
  backendUrl?: string
) {
  const data = await loadState<CampaignState>(key, backendUrl);
  if (!data) return;
  for (const [name, store] of Object.entries(slices)) {
    const slice = (data as any)[name];
    if (slice) store.setState(slice, true);
  }
}

