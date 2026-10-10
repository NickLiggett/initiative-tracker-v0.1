import { describe, expect, it } from "vitest";
import { applyHpInput, nextTurn, previousTurn, removeCombatant, setAllRevealed, sortByInitiative, updateCombatant } from "./combatants";

const party = [
  { id: 1, name: "Aria", initiative: 12, reaction: true },
  { id: 2, name: "Bram", initiative: 18, reaction: true },
  { id: 3, name: "Goblin", initiative: 7, reaction: true },
];

describe("applyHpInput", () => {
  it("heals with +, damages with -, and otherwise sets HP", () => {
    expect(applyHpInput(20, "+5")).toBe(25);
    expect(applyHpInput(20, "-7")).toBe(13);
    expect(applyHpInput(20, "8")).toBe(8);
    expect(applyHpInput("", "+3")).toBe(3);
  });

  it("returns NaN for input that isn't a number", () => {
    expect(applyHpInput(20, "lots")).toBeNaN();
  });
});

describe("turn order", () => {
  it("sorts by initiative, highest first", () => {
    expect(sortByInitiative(party).map((c) => c.name)).toEqual(["Bram", "Aria", "Goblin"]);
  });

  it("moves the current combatant to the end and resets the next one's reaction", () => {
    const next = nextTurn(party);
    expect(next.map((c) => c.name)).toEqual(["Bram", "Goblin", "Aria"]);
    expect(next[0].reaction).toBe(false);
    expect(party[1].reaction).toBe(true); // the original isn't changed
  });

  it("moves the last combatant back to the front", () => {
    expect(previousTurn(party).map((c) => c.name)).toEqual(["Goblin", "Aria", "Bram"]);
  });

  it("handles an empty list", () => {
    expect(nextTurn([])).toEqual([]);
    expect(previousTurn([])).toEqual([]);
  });
});

describe("editing", () => {
  it("updates and removes by id without changing the original", () => {
    expect(updateCombatant(party, 2, { initiative: 20 })[1]).toEqual({ ...party[1], initiative: 20 });
    expect(removeCombatant(party, 1).map((c) => c.id)).toEqual([2, 3]);
    expect(party).toHaveLength(3);
  });
});

describe("setAllRevealed", () => {
  const rows = [
    { id: 1, name: "Gribble", type: "PC", playerId: 5 },
    { id: 2, name: "Snarl", type: "NPC" },
    { id: 3, name: "Goblin", type: "Creature", revealed: true },
    { id: 4, name: "Hero", type: "PC" },
  ];

  it("shows or hides the monsters and others, and leaves the characters alone", () => {
    const shown = setAllRevealed(rows, true);
    expect(shown.map((row) => row.revealed)).toEqual([undefined, true, true, undefined]);
    expect(setAllRevealed(shown, false).map((row) => row.revealed)).toEqual([undefined, false, false, undefined]);
  });

  it("does not change what it was given", () => {
    setAllRevealed(rows, false);
    expect(rows[2].revealed).toBe(true);
  });
});
