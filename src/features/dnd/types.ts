export interface DndBase {
  id: string;
  name: string;
}

export interface NpcData extends DndBase {}

export interface QuestData extends DndBase {}

export interface EncounterData extends DndBase {}
