import { Encounter } from "../encounters";
import type { Npc } from "./types";
import { selectTarget, attack } from "./ai";

export class MonsterAI {
  combatants: Record<string, Npc>;

  constructor(combatants: Npc[]) {
    this.combatants = Object.fromEntries(
      combatants.map((c) => [c.name, { ...c }])
    );
  }

  takeTurn(encounter: Encounter, roll?: number): Encounter {
    if (encounter.participants.length === 0) {
      return encounter;
    }
    const current = encounter.participants[encounter.current];
    const actor = this.combatants[current.name];
    if (!actor || !actor.isMonster || actor.hp <= 0) {
      return encounter.advance();
    }
    const candidates = encounter.participants
      .map((p) => this.combatants[p.name])
      .filter(
        (c): c is Npc => !!c && c.name !== actor.name && c.hp > 0
      );
    const target = selectTarget(actor, candidates);
    if (target) {
      attack(actor, target, roll);
    }
    return encounter.advance();
  }
}
