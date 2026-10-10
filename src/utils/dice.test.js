import { describe, expect, it } from "vitest";
import { averageOf, formatDice, parseDice, rollD20, rollDice, rollDie } from "./dice";

/** Dice that give these faces in turn (a face on a die of any size: face n comes from (n - 0.5) / sides, set by `sides`). */
function faces(sides, ...numbers) {
  let next = 0;
  return () => (numbers[next++ % numbers.length] - 1) / sides;
}

describe("parseDice", () => {
  it("reads dice with and without a bonus, with any minus sign and any spacing", () => {
    expect(parseDice("1d8")).toEqual({ count: 1, sides: 8, bonus: 0 });
    expect(parseDice("2d6 + 4")).toEqual({ count: 2, sides: 6, bonus: 4 });
    expect(parseDice(" 3D10-2 ")).toEqual({ count: 3, sides: 10, bonus: -2 });
    expect(parseDice("1d4 − 1")).toEqual({ count: 1, sides: 4, bonus: -1 });
  });

  it("is null for anything else", () => {
    for (const text of ["", null, "d6", "2d", "0d6", "2d0", "7", "2d6 +", "fire"]) {
      expect(parseDice(text)).toBeNull();
    }
  });
});

describe("formatDice and averageOf", () => {
  it("write the dice and say what they average", () => {
    expect(formatDice({ count: 2, sides: 6, bonus: 4 })).toBe("2d6 + 4");
    expect(formatDice({ count: 1, sides: 8, bonus: -1 })).toBe("1d8 - 1");
    expect(formatDice({ count: 3, sides: 10, bonus: 0 })).toBe("3d10");
    expect(averageOf({ count: 2, sides: 6, bonus: 4 })).toBe(11);
    expect(averageOf({ count: 1, sides: 8, bonus: 0 })).toBe(4.5);
  });
});

describe("rolling", () => {
  it("rolls a die from 1 to its sides", () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999)).toBe(20);
  });

  it("adds up the dice and the bonus", () => {
    const result = rollDice({ count: 2, sides: 6, bonus: 4 }, { random: faces(6, 3, 5) });

    expect(result).toEqual({ total: 12, rolls: [3, 5], bonus: 4 });
  });

  it("doubles the dice, not the bonus, for a critical hit", () => {
    const result = rollDice({ count: 2, sides: 6, bonus: 4 }, { critical: true, random: faces(6, 1, 2, 3, 4) });

    expect(result).toEqual({ total: 14, rolls: [1, 2, 3, 4], bonus: 4 });
  });

  it("never gives less than nothing", () => {
    expect(rollDice({ count: 1, sides: 4, bonus: -5 }, { random: faces(4, 1) }).total).toBe(0);
  });

  it("rolls a d20 and adds the bonus", () => {
    expect(rollD20(5, { random: faces(20, 12) })).toEqual({ total: 17, natural: 12, rolls: [12], bonus: 5 });
    expect(rollD20(-1, { random: faces(20, 3) }).total).toBe(2);
  });

  it("takes the better of two d20s with advantage and the worse with disadvantage", () => {
    expect(rollD20(0, { mode: "advantage", random: faces(20, 4, 15) })).toMatchObject({ natural: 15, rolls: [4, 15] });
    expect(rollD20(0, { mode: "disadvantage", random: faces(20, 4, 15) })).toMatchObject({ natural: 4, rolls: [4, 15] });
  });
});
