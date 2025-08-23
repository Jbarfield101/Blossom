import { Encounter } from "../encounters";
import type { Npc } from "./types";
import { selectTarget, attack, type TargetStrategy } from "./ai";

export class MonsterAI {
  combatants: Record<string, Npc>;
  strategy: TargetStrategy;

  constructor(combatants: Npc[], strategy: TargetStrategy = "random") {
    this.combatants = Object.fromEntries(
      combatants.map((c) => [c.name, { ...c }])
    );
    this.strategy = strategy;
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
    const target = selectTarget(actor, candidates, this.strategy);
    if (target) {
      attack(actor, target, roll);
    }
    return encounter.advance();
  }
}
