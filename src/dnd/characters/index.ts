import type { Item } from "../items";
import type { Spell } from "../spells";

export type Ability =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export interface Character {
  abilities: Record<Ability, number>;
  class: string;
  level: number;
  hp: number;
  inventory: Item[];
  spells: Spell[];
  spellSlots: Record<number, number>;
}
