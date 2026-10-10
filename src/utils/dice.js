// Dice, as plain functions. Every roll takes the dice as a function (`Math.random` by default) so that tests can choose them.

/** @typedef {{count: number, sides: number, bonus: number}} Dice  e.g. 2d6 + 4 is {count: 2, sides: 6, bonus: 4} */

/**
 * The dice in "2d6 + 4", "1d8-1" or "3d10" (a minus sign of any kind), or null if the text isn't dice.
 * @returns {?Dice}
 */
export function parseDice(text) {
  const match = /^\s*(\d+)\s*d\s*(\d+)\s*(?:([+\-−–])\s*(\d+))?\s*$/i.exec(String(text ?? ""));
  if (!match) {
    return null;
  }
  const [, count, sides, sign, bonus] = match;
  const dice = { count: Number(count), sides: Number(sides), bonus: sign ? (sign === "+" ? 1 : -1) * Number(bonus) : 0 };
  return dice.count > 0 && dice.sides > 0 ? dice : null;
}

/** "2d6 + 4", "1d8 - 1", "3d10": the dice as they are written. */
export function formatDice({ count, sides, bonus }) {
  return `${count}d${sides}${bonus > 0 ? ` + ${bonus}` : bonus < 0 ? ` - ${-bonus}` : ""}`;
}

/** What the dice come to on average (4.5 for 1d8; the bonus is added). Not rounded. */
export function averageOf({ count, sides, bonus }) {
  return (count * (sides + 1)) / 2 + bonus;
}

/** One die: a whole number from 1 to `sides`. */
export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}

/**
 * Rolls the dice.
 * @param {Dice} dice
 * @param {{random?: () => number, critical?: boolean}} [options] a critical hit rolls double the dice, not the bonus
 * @returns {{total: number, rolls: number[], bonus: number}} the total is never less than 0
 */
export function rollDice(dice, { random = Math.random, critical = false } = {}) {
  const count = critical ? dice.count * 2 : dice.count;
  const rolls = Array.from({ length: count }, () => rollDie(dice.sides, random));
  return { total: Math.max(0, rolls.reduce((sum, roll) => sum + roll, 0) + dice.bonus), rolls, bonus: dice.bonus };
}

/**
 * Rolls a d20 and adds a bonus.
 * @param {number} bonus
 * @param {{mode?: "normal"|"advantage"|"disadvantage", random?: () => number}} [options]
 * @returns {{total: number, natural: number, rolls: number[], bonus: number}} `natural` is the d20 that counts, of the
 *   two rolled with advantage or disadvantage
 */
export function rollD20(bonus, { mode = "normal", random = Math.random } = {}) {
  const rolls = mode === "normal" ? [rollDie(20, random)] : [rollDie(20, random), rollDie(20, random)];
  const natural = mode === "advantage" ? Math.max(...rolls) : mode === "disadvantage" ? Math.min(...rolls) : rolls[0];
  return { total: natural + bonus, natural, rolls, bonus };
}
