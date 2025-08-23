import type { Npc } from "./types";
import { rollDice } from "../rules";

export function selectTarget(self: Npc, combatants: Npc[]): Npc | undefined {
  return combatants.find((c) => c.name !== self.name && c.hp > 0);
}

export function attack(
  attacker: Npc,
  target: Npc,
  roll: number = rollDice(20)
): boolean {
  const hit = roll + attacker.attackBonus >= target.ac;
  if (hit) {
    target.hp = Math.max(0, target.hp - attacker.damage);
  }
  return hit;
}
