import type { Item } from "../items";
import type { Spell } from "../spells";

export interface Character {
  abilities: Record<string, number>;
  class: string;
  level: number;
  hp: number;
  inventory: Item[];
  spells: Spell[];
  spellSlots: Record<number, number>;
}
