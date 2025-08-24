export function rollDice(
  sides: number,
  rng: () => number = Math.random
): number {
  return Math.floor(rng() * sides) + 1;
}

export interface DiceRoll {
  sides: number;
  value: number;
}

/**
 * Roll dice using a simple expression like "2d20 + 1d4".
 *
 * The expression supports multiple terms separated by "+" where each term is
 * of the form "XdY" (e.g. "2d6") or a plain number to add a constant. The
 * dice are rolled from left to right using the provided RNG. The result
 * includes the total and the individual rolls.
 */
export function rollDiceExpression(
  expression: string,
  rng: () => number = Math.random
): { total: number; rolls: DiceRoll[] } {
  const terms = expression.split("+").map((t) => t.trim());
  const rolls: DiceRoll[] = [];
  let total = 0;

  for (const term of terms) {
    const match = term.match(/^(\d*)d(\d+)$/i);
    if (match) {
      const count = Number(match[1] || 1);
      const sides = Number(match[2]);
      for (let i = 0; i < count; i++) {
        const value = rollDice(sides, rng);
        rolls.push({ sides, value });
        total += value;
      }
    } else {
      const constant = Number(term);
      if (!Number.isNaN(constant)) {
        total += constant;
      }
    }
  }

  return { total, rolls };
}
