// How hard an encounter is, as plain functions: the 2014 rules (adjusted XP against each character's thresholds) and the
// 2024 rules (an XP budget).
//
// The tables are the numbers printed in the Dungeon Master's Guides, typed in here: Open5e's data doesn't have them. If
// you have the books, check them against them; they are the only place these numbers are kept.

/** The rule sets an encounter can be measured by, as a player's `ruleset` names them. */
export const ENCOUNTER_RULESETS = [
  { key: "5e-2024", label: "2024 rules" },
  { key: "5e-2014", label: "2014 rules" },
];

/** XP by challenge rating. */
const XP_BY_CHALLENGE_RATING = new Map([
  [0, 10], [0.125, 25], [0.25, 50], [0.5, 100], [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300],
  [7, 2900], [8, 3900], [9, 5000], [10, 5900], [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000],
  [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000], [21, 33000], [22, 41000], [23, 50000],
  [24, 62000], [25, 75000], [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
]);

/** What a creature is worth: its own XP when the source gives one, else what its challenge rating is worth. */
export function creatureXp(creature) {
  if (Number.isFinite(creature?.experiencePoints)) {
    return creature.experiencePoints;
  }
  return XP_BY_CHALLENGE_RATING.get(creature?.challengeRating) ?? 0;
}

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;

/** A level as a whole number from 1 to 20 (the nearest one for anything outside, 1 for what isn't a number). */
export function clampLevel(level) {
  const number = Math.trunc(Number(level));
  return Number.isFinite(number) ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, number)) : MIN_LEVEL;
}

// ---- 2014 ----

/** [easy, medium, hard, deadly] XP for one character, by level (index 0 is level 1). */
const THRESHOLDS_2014 = [
  [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100],
  [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700],
];

/** The multipliers for the number of monsters, from fewest-monster steps to most. */
const MULTIPLIERS_2014 = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

/**
 * What the monsters' total XP is multiplied by, for how many there are: 1 monster ×1, 2 ×1.5, 3-6 ×2, 7-10 ×2.5,
 * 11-14 ×3, 15 or more ×4. A party of fewer than three characters takes the next multiplier up, and a party of six or
 * more the next one down (a lone monster against a big party is ×0.5).
 */
export function monsterMultiplier(monsterCount, partySize) {
  if (monsterCount <= 0) {
    return 0;
  }
  let step = monsterCount === 1 ? 1 : monsterCount === 2 ? 2 : monsterCount <= 6 ? 3 : monsterCount <= 10 ? 4 : monsterCount <= 14 ? 5 : 6;
  if (partySize < 3) {
    step += 1;
  } else if (partySize >= 6) {
    step -= 1;
  }
  return MULTIPLIERS_2014[Math.min(MULTIPLIERS_2014.length - 1, Math.max(0, step))];
}

/**
 * The difficulty of an encounter by the 2014 rules.
 * @param {number[]} levels each character's level
 * @param {{xp: number, count: number}[]} monsters each kind of monster, with its XP and how many of it
 * @returns {{xp: number, multiplier: number, adjustedXp: number, thresholds: {easy: number, medium: number, hard: number, deadly: number}, label: string}}
 *   `label` is "Trivial" (below Easy), "Easy", "Medium", "Hard" or "Deadly"
 */
export function difficulty2014(levels, monsters) {
  const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const level of levels) {
    const [easy, medium, hard, deadly] = THRESHOLDS_2014[clampLevel(level) - 1];
    thresholds.easy += easy;
    thresholds.medium += medium;
    thresholds.hard += hard;
    thresholds.deadly += deadly;
  }
  const xp = monsters.reduce((sum, monster) => sum + monster.xp * monster.count, 0);
  const count = monsters.reduce((sum, monster) => sum + monster.count, 0);
  const multiplier = monsterMultiplier(count, levels.length);
  const adjustedXp = Math.round(xp * multiplier);
  const label =
    levels.length === 0 || count === 0
      ? "—"
      : adjustedXp >= thresholds.deadly
        ? "Deadly"
        : adjustedXp >= thresholds.hard
          ? "Hard"
          : adjustedXp >= thresholds.medium
            ? "Medium"
            : adjustedXp >= thresholds.easy
              ? "Easy"
              : "Trivial";
  return { xp, multiplier, adjustedXp, thresholds, label };
}

// ---- 2024 ----

/** [low, moderate, high] XP budget for one character, by level (index 0 is level 1). */
const BUDGETS_2024 = [
  [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400],
  [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100],
  [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800],
  [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000],
];

/**
 * The difficulty of an encounter by the 2024 rules: the monsters' XP, added up with no multiplier, against the party's
 * XP budget for a Low, Moderate or High encounter.
 * @param {number[]} levels each character's level
 * @param {{xp: number, count: number}[]} monsters each kind of monster, with its XP and how many of it
 * @returns {{xp: number, budgets: {low: number, moderate: number, high: number}, label: string}}
 *   `label` is the lowest of "Low", "Moderate" and "High" whose budget covers the XP, or "Over budget" above High
 */
export function difficulty2024(levels, monsters) {
  const budgets = { low: 0, moderate: 0, high: 0 };
  for (const level of levels) {
    const [low, moderate, high] = BUDGETS_2024[clampLevel(level) - 1];
    budgets.low += low;
    budgets.moderate += moderate;
    budgets.high += high;
  }
  const xp = monsters.reduce((sum, monster) => sum + monster.xp * monster.count, 0);
  const count = monsters.reduce((sum, monster) => sum + monster.count, 0);
  const label =
    levels.length === 0 || count === 0
      ? "—"
      : xp <= budgets.low
        ? "Low"
        : xp <= budgets.moderate
          ? "Moderate"
          : xp <= budgets.high
            ? "High"
            : "Over budget";
  return { xp, budgets, label };
}
