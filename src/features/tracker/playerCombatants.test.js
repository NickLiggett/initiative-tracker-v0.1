import { describe, expect, it } from "vitest";
import { parseInitiative, playerCombatant, playerIdsIn, rollInitiative } from "./playerCombatants";

const thorin = { id: 4, name: "Thorin", armorClass: 18, hitPoints: 52, initiativeBonus: 1 };

describe("playerCombatant", () => {
  it("is a PC with the player's numbers, remembering which player it is", () => {
    expect(playerCombatant(thorin, 14)).toEqual({
      initiative: 14,
      name: "Thorin",
      ac: 18,
      hp: 52,
      reaction: false,
      type: "PC",
      creature: null,
      playerId: 4,
    });
  });

  it("leaves armor class and hit points empty when the player has none", () => {
    expect(playerCombatant({ ...thorin, armorClass: null, hitPoints: null }, 3)).toMatchObject({ ac: "", hp: "" });
  });
});

describe("playerIdsIn", () => {
  it("is the players already in the order, and ignores the rest", () => {
    const ids = playerIdsIn([{ id: 1, playerId: 4 }, { id: 2 }, { id: 3, playerId: null }, { id: 4, playerId: 9 }]);

    expect([...ids].sort()).toEqual([4, 9]);
  });
});

describe("rollInitiative", () => {
  it("is a d20 plus the bonus", () => {
    expect(rollInitiative(3, () => 0)).toBe(4); // a 1
    expect(rollInitiative(3, () => 0.999)).toBe(23); // a 20
    expect(rollInitiative(-2, () => 0.5)).toBe(9); // an 11
  });

  it("uses real dice by default, within range", () => {
    for (let i = 0; i < 200; i++) {
      const roll = rollInitiative(0);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });
});

describe("parseInitiative", () => {
  it("reads one or two digits, with a minus", () => {
    expect(parseInitiative("12")).toBe(12);
    expect(parseInitiative(" -1 ")).toBe(-1);
    expect(parseInitiative("0")).toBe(0);
  });

  it("is null for anything else", () => {
    for (const text of ["", "  ", "abc", "1.5", "123", "+3", "1e2"]) {
      expect(parseInitiative(text)).toBeNull();
    }
  });
});
