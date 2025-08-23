import { Character } from "../characters";
import { attackRoll, calculateDamage } from "./core";

export interface Weapon {
  diceCount: number;
  diceSides: number;
  ability: string;
  modifier?: number;
}

export class CombatEngine {
  static resolveAttack(
    attacker: Character,
    defenderAC: number,
    weapon: Weapon
  ) {
    const attack = attackRoll(attacker, weapon.ability, defenderAC);
    if (attack.hit) {
      const abilityMod = attacker.abilities[weapon.ability] ?? 0;
      const damage = calculateDamage(
        weapon.diceCount,
        weapon.diceSides,
        abilityMod + (weapon.modifier ?? 0)
      );
      return { ...attack, damage: damage.total };
    }
    return { ...attack, damage: 0 };
  }
}
