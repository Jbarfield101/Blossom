export interface DndBase {
  id: string;
  name: string;
}

export type DndTheme = "Parchment" | "Ink" | "Minimal";

export interface NpcData extends DndBase {
  tags: string[];
  appearance: string;
  personality: string;
  motivation: string;
  secret: string;
  hooks: string[];
  stat_block_ref: string;
  stat_overrides: string;
  theme: DndTheme;
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
