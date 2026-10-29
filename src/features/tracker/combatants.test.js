import { describe, expect, it } from "vitest";
import { allFieldShown, applyHpInput, fieldShown, fieldShownChange, setFieldShownForAll, nextTurn, previousTurn, removeCombatant, setAllRevealed, sortByInitiative, updateCombatant } from "./combatants";

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

describe("what the players see of a row", () => {
  const goblin = { id: 3, name: "Goblin", type: "Creature" };

  it("shows a name unless hidden, and AC and HP only when revealed, each on its own", () => {
    expect(["name", "ac", "hp"].map((field) => fieldShown(goblin, field))).toEqual([true, false, false]);
    expect(fieldShown({ ...goblin, nameHidden: true, acRevealed: true }, "name")).toBe(false);
    expect(fieldShown({ ...goblin, nameHidden: true, acRevealed: true }, "ac")).toBe(true);
    expect(fieldShown({ ...goblin, nameHidden: true, acRevealed: true }, "hp")).toBe(false);
  });

  it("lets the older single flag stand for AC and HP until they are set apart", () => {
    const old = { ...goblin, revealed: true };
    expect([fieldShown(old, "ac"), fieldShown(old, "hp")]).toEqual([true, true]);
    expect([fieldShown({ ...old, hpRevealed: false }, "ac"), fieldShown({ ...old, hpRevealed: false }, "hp")]).toEqual([true, false]);
  });

  it("always shows a character", () => {
    expect(["name", "ac", "hp"].map((field) => fieldShown({ type: "PC", nameHidden: true }, field))).toEqual([true, true, true]);
  });

  it("changes one field of every row but the characters, and says when all are shown", () => {
    const rows = [{ id: 1, type: "PC" }, goblin, { id: 4, name: "Orc", type: "Creature" }];

    const shown = setFieldShownForAll(rows, "hp", true);

    expect(shown.map((row) => row.hpRevealed)).toEqual([undefined, true, true]);
    expect(allFieldShown(shown, "hp")).toBe(true);
    expect(allFieldShown(shown, "ac")).toBe(false);
    expect(allFieldShown([rows[0]], "hp")).toBe(false);
    expect(fieldShownChange("name", false)).toEqual({ nameHidden: true });
  });
});
