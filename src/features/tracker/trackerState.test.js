import { describe, expect, it } from "vitest";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import { creatureKeys, fromSavedState, nextCombatantId, toSavedState } from "./trackerState";

const gribble = { id: 1, name: "Gribble", initiative: 18, ac: 14, hp: 22, reaction: false, type: "PC", creature: null };
const wyrm = { id: 2, name: "Red Wyrm", initiative: 12, ac: 19, hp: 256, reaction: true, type: "Creature", creature: dragon };

describe("toSavedState", () => {
  it("keeps each combatant's own details and, for a creature, just its key", () => {
    expect(toSavedState([gribble, wyrm])).toEqual({
      version: 1,
      combatants: [
        { id: 1, name: "Gribble", initiative: 18, ac: 14, hp: 22, reaction: false, type: "PC", creatureKey: null },
        { id: 2, name: "Red Wyrm", initiative: 12, ac: 19, hp: 256, reaction: true, type: "Creature", creatureKey: dragon.key },
      ],
    });
  });

  it("is small however big the stat blocks are", () => {
    expect(JSON.stringify(toSavedState([wyrm])).length).toBeLessThan(400);
    expect(JSON.stringify(toSavedState([wyrm])).length).toBeLessThan(JSON.stringify(wyrm).length / 10);
  });

  it("keeps the order, which is the turn order", () => {
    expect(toSavedState([wyrm, gribble]).combatants.map((combatant) => combatant.id)).toEqual([2, 1]);
  });

  it("is an empty tracker for no combatants", () => {
    expect(toSavedState([])).toEqual({ version: 1, combatants: [] });
  });
});

describe("creatureKeys", () => {
  it("lists each creature once, and not combatants without one", () => {
    const state = {
      combatants: [
        { id: 1, creatureKey: "srd_goblin" },
        { id: 2, creatureKey: null },
        { id: 3, creatureKey: "srd_goblin" },
        { id: 4, creatureKey: "srd_wolf" },
        { id: 5 },
        { id: 6, creatureKey: "" },
        { id: 7, creatureKey: 12 },
      ],
    };

    expect(creatureKeys(state)).toEqual(["srd_goblin", "srd_wolf"]);
  });

  it("copes with anything", () => {
    for (const nothing of [undefined, null, {}, { combatants: "no" }, "text"]) {
      expect(creatureKeys(nothing)).toEqual([]);
    }
  });
});

describe("fromSavedState", () => {
  it("puts the creatures back by key", () => {
    const restored = fromSavedState(toSavedState([gribble, wyrm]), { [dragon.key]: dragon });

    expect(restored).toEqual([gribble, wyrm]);
    expect(restored[1].creature).toBe(dragon);
  });

  it("brings a combatant back without its creature when the creature can't be found, but still knowing which it was", () => {
    const restored = fromSavedState(toSavedState([wyrm]), {});

    expect(restored).toEqual([{ ...wyrm, creature: null, creatureKey: dragon.key }]);
  });

  it("doesn't forget a creature that couldn't be found when the tracker is saved again", () => {
    const restored = fromSavedState(toSavedState([gribble, wyrm]), {});

    expect(toSavedState(restored)).toEqual(toSavedState([gribble, wyrm]));
  });

  it("forgets the key once the creature is there again", () => {
    const [back] = fromSavedState(toSavedState([wyrm]), { [dragon.key]: dragon });

    expect(back).not.toHaveProperty("creatureKey");
    expect(back.creature).toBe(dragon);
  });

  it("leaves out what isn't a combatant", () => {
    const restored = fromSavedState(
      { combatants: [null, "text", 5, { name: "no id" }, { id: "1", name: "string id" }, { id: 1.5 }, { id: 3, name: "ok" }] },
      {},
    );

    expect(restored).toEqual([{ id: 3, name: "ok", creature: null }]);
  });

  it("is no combatants for an empty or strange state", () => {
    for (const nothing of [undefined, null, {}, { combatants: null }, { combatants: {} }, []]) {
      expect(fromSavedState(nothing, {})).toEqual([]);
    }
  });
});

describe("nextCombatantId", () => {
  it("is one more than the highest id, so a restored tracker doesn't reuse one", () => {
    expect(nextCombatantId([])).toBe(1);
    expect(nextCombatantId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8);
  });
});
