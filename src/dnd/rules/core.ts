import { Character, type Ability } from "../characters";
import { rollDice } from "./dice";

export function abilityCheck(
  character: Character,
  ability: Ability,
  dc: number,
  rng: () => number = Math.random
) {
  const roll = rollDice(20, rng);
  const modifier = character.abilities[ability] ?? 0;
  const total = roll + modifier;
  return { roll, total, success: total >= dc };
}

export function attackRoll(
  attacker: Character,
  ability: Ability,
  targetAC: number,
  rng: () => number = Math.random
) {
  const roll = rollDice(20, rng);
  const modifier = attacker.abilities[ability] ?? 0;
  const total = roll + modifier;
  const critical = roll === 20;
  const fumble = roll === 1;
  const hit = critical ? true : fumble ? false : total >= targetAC;
  return { roll, total, hit, critical, fumble };
}

export function calculateDamage(
  diceCount: number,
  diceSides: number,
  modifier = 0,
  rng: () => number = Math.random
) {
  const rolls = Array.from({ length: diceCount }, () => rollDice(diceSides, rng));
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, total };
}

export function savingThrow(
  character: Character,
  ability: Ability,
  dc: number,
  rng: () => number = Math.random
) {
  const roll = rollDice(20, rng);
  const modifier = character.abilities[ability] ?? 0;
  const total = roll + modifier;
  return { roll, total, success: total >= dc };
}
