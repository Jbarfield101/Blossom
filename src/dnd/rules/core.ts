import { Character } from "../characters";
import { rollDice } from "./dice";

export function abilityCheck(
  character: Character,
  ability: string,
  dc: number
) {
  const roll = rollDice(20);
  const modifier = character.abilities[ability] ?? 0;
  const total = roll + modifier;
  return { roll, total, success: total >= dc };
}

export function attackRoll(
  attacker: Character,
  ability: string,
  targetAC: number
) {
  const roll = rollDice(20);
  const modifier = attacker.abilities[ability] ?? 0;
  const total = roll + modifier;
  return { roll, total, hit: total >= targetAC };
}

export function calculateDamage(
  diceCount: number,
  diceSides: number,
  modifier = 0
) {
  const rolls = Array.from({ length: diceCount }, () => rollDice(diceSides));
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, total };
}

export function savingThrow(
  character: Character,
  ability: string,
  dc: number
) {
  const roll = rollDice(20);
  const modifier = character.abilities[ability] ?? 0;
  const total = roll + modifier;
  return { roll, total, success: total >= dc };
}
