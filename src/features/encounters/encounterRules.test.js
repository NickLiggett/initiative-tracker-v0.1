import { describe, expect, it } from "vitest";
import { clampLevel, creatureXp, difficulty2014, difficulty2024, monsterMultiplier } from "./encounterRules";

describe("creatureXp", () => {
  it("is the creature's own XP when it has one", () => {
    expect(creatureXp({ experiencePoints: 450, challengeRating: 2 })).toBe(450);
    expect(creatureXp({ experiencePoints: 0, challengeRating: 5 })).toBe(0);
  });

  it("is what its challenge rating is worth when it doesn't, including the fractions", () => {
    expect(creatureXp({ challengeRating: 0.25 })).toBe(50);
    expect(creatureXp({ challengeRating: 0 })).toBe(10);
    expect(creatureXp({ challengeRating: 17 })).toBe(18000);
  });

  it("is nothing for a creature that says neither", () => {
    expect(creatureXp({})).toBe(0);
    expect(creatureXp(null)).toBe(0);
  });
});

describe("clampLevel", () => {
  it("keeps a level from 1 to 20, whole", () => {
    expect([0, 1, 7.9, 20, 25, -3].map(clampLevel)).toEqual([1, 1, 7, 20, 20, 1]);
    expect(clampLevel("5")).toBe(5);
    expect(clampLevel("x")).toBe(1);
  });
});

describe("monsterMultiplier (2014)", () => {
  it("steps up with the number of monsters for a party of three to five", () => {
    const multipliers = [1, 2, 3, 6, 7, 10, 11, 14, 15, 30].map((count) => monsterMultiplier(count, 4));

    expect(multipliers).toEqual([1, 1.5, 2, 2, 2.5, 2.5, 3, 3, 4, 4]);
  });

  it("takes the next multiplier up for a party of fewer than three", () => {
    expect([1, 2, 3, 7, 11, 15].map((count) => monsterMultiplier(count, 2))).toEqual([1.5, 2, 2.5, 3, 4, 5]);
  });

  it("takes the next one down for a party of six or more, to a half for a lone monster", () => {
    expect([1, 2, 3, 7, 11, 15].map((count) => monsterMultiplier(count, 6))).toEqual([0.5, 1, 1.5, 2, 2.5, 3]);
  });

  it("is nothing without monsters", () => {
    expect(monsterMultiplier(0, 4)).toBe(0);
  });
});

describe("difficulty2014", () => {
  const four = [3, 3, 3, 3];

  it("adds up each character's thresholds", () => {
    expect(difficulty2014(four, []).thresholds).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 });
    expect(difficulty2014([1, 5, 20], []).thresholds).toEqual({ easy: 25 + 250 + 2800, medium: 50 + 500 + 5700, hard: 75 + 750 + 8500, deadly: 100 + 1100 + 12700 });
  });

  it("measures the multiplied XP against them", () => {
    // four level 3 characters: 300 / 600 / 900 / 1,600
    const against = (xp, count = 1) => difficulty2014(four, [{ xp, count }]).label;

    expect(against(200)).toBe("Trivial");
    expect(against(300)).toBe("Easy");
    expect(against(599)).toBe("Easy");
    expect(against(600)).toBe("Medium");
    expect(against(900)).toBe("Hard");
    expect(against(1600)).toBe("Deadly");
  });

  it("multiplies by the number of monsters before measuring", () => {
    const result = difficulty2014(four, [{ xp: 200, count: 3 }, { xp: 50, count: 1 }]); // 4 monsters: x2

    expect(result).toMatchObject({ xp: 650, multiplier: 2, adjustedXp: 1300, label: "Hard" });
  });

  it("says nothing without a party or without monsters", () => {
    expect(difficulty2014([], [{ xp: 100, count: 1 }]).label).toBe("—");
    expect(difficulty2014(four, []).label).toBe("—");
    expect(difficulty2014(four, [{ xp: 100, count: 0 }]).label).toBe("—");
  });
});

describe("difficulty2024", () => {
  const four = [3, 3, 3, 3];

  it("adds up each character's budget", () => {
    expect(difficulty2024(four, []).budgets).toEqual({ low: 600, moderate: 900, high: 1600 });
    expect(difficulty2024([1, 20], []).budgets).toEqual({ low: 50 + 6400, moderate: 75 + 13200, high: 100 + 22000 });
  });

  it("names the smallest budget that covers the XP, with no multiplier for the number of monsters", () => {
    const against = (xp, count = 1) => difficulty2024(four, [{ xp, count }]).label;

    expect(against(100)).toBe("Low");
    expect(against(600)).toBe("Low");
    expect(against(601)).toBe("Moderate");
    expect(against(900)).toBe("Moderate");
    expect(against(1600)).toBe("High");
    expect(against(1601)).toBe("Over budget");
    expect(difficulty2024(four, [{ xp: 100, count: 8 }]).xp).toBe(800);
  });

  it("says nothing without a party or without monsters", () => {
    expect(difficulty2024([], [{ xp: 100, count: 1 }]).label).toBe("—");
    expect(difficulty2024(four, []).label).toBe("—");
  });
});
