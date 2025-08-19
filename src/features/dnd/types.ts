export interface DndBase {
  id: string;
  name: string;
}

export type DndTheme = "Parchment" | "Ink" | "Minimal";

export interface NpcData extends DndBase {
  species: string;
  role: string;
  alignment: string;
  backstory?: string;
  location?: string;
  hooks: string[];
  quirks?: string[];
  voice: {
    style: string;
    provider: string;
    preset: string;
  };
  portrait?: string;
  statblock: Record<string, unknown>;
  tags: string[];
}

export interface LoreData extends DndBase {
  summary: string;
  location?: string;
  hooks?: string[];
  tags: string[];
}

export interface QuestData extends DndBase {
  tier: string;
  summary: string;
  beats: string[];
  rewards: {
    gp?: string;
    items?: string;
    favors?: string;
  };
  complications: string[];
  theme: DndTheme;
}

export interface EncounterData extends DndBase {
  level: string;
  creatures: string[];
  tactics: string;
  terrain: string;
  treasure: string;
  scaling: string;
  theme: DndTheme;
}
