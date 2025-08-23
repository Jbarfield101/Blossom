export function rollDice(
  sides: number,
  rng: () => number = Math.random
): number {
  return Math.floor(rng() * sides) + 1;
}
