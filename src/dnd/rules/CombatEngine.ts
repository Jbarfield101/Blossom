import { Character, type Ability } from "../characters";
import { attackRoll, calculateDamage } from "./core";

export interface Weapon {
  diceCount: number;
  diceSides: number;
  ability: Ability;
  modifier?: number;
}

export class CombatEngine {
  static resolveAttack(
    attacker: Character,
    defenderAC: number,
    weapon: Weapon,
    rng: () => number = Math.random
  ) {
    const attack = attackRoll(attacker, weapon.ability, defenderAC, rng);
    if (attack.hit) {
      const abilityMod = attacker.abilities[weapon.ability] ?? 0;
      const damage = calculateDamage(
        weapon.diceCount,
        weapon.diceSides,
        abilityMod + (weapon.modifier ?? 0),
        rng
      );
      const totalDamage = attack.critical ? damage.total * 2 : damage.total;
      return { ...attack, damage: totalDamage };
    }
    return { ...attack, damage: 0 };
  }
}
