export interface DndBase {
  id: string;
  name: string;
}

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
}

export interface EncounterData extends DndBase {
  level: number;
  creatures: string[];
  tactics: string;
  terrain: string;
  treasure: string;
  scaling: string;
}

export interface RuleData extends DndBase {
  description: string;
  tags: string[];
  sourceId?: string;
  sections?: Record<string, string>;
}

export interface SpellData extends DndBase {
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  tags: string[];
}
