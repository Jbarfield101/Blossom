import type { Npc } from "./types";
import { rollDice } from "../rules";

export type TargetStrategy = "random" | "lowest-hp";

export function selectTarget(
  self: Npc,
  combatants: Npc[],
  strategy: TargetStrategy = "random"
): Npc | undefined {
  const targets = combatants.filter(
    (c) => c.name !== self.name && c.hp > 0
  );
  if (targets.length === 0) {
    return undefined;
  }
  if (strategy === "lowest-hp") {
    return targets.reduce((lowest, c) => (c.hp < lowest.hp ? c : lowest));
  }
  const index = Math.floor(Math.random() * targets.length);
  return targets[index];
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
