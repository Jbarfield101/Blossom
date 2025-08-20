export interface DndBase {
  id: string;
  name: string;
}

export type DndTheme = "Parchment" | "Ink" | "Minimal";

import type { Npc } from "../../dnd/schemas/npc";

export type NpcData = Npc;

export interface LoreData extends DndBase {
  summary: string;
  location?: string;
  hooks?: string[];
  tags: string[];
}

export interface QuestData extends DndBase {
  tier: number;
  summary: string;
  beats: string[];
  rewards: {
    gp?: number;
    items?: string;
    favors?: string;
  };
  complications: string[];
  theme: DndTheme;
}

export interface EncounterData extends DndBase {
  level: number;
  creatures: string[];
  tactics: string;
  terrain: string;
  treasure: string;
  scaling: string;
  theme: DndTheme;
}
