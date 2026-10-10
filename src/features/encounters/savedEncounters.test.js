import { describe, expect, it } from "vitest";
import { cleanName, isSaved, nextId, readSaved, summarize, toState, withEncounter, withoutEncounter } from "./savedEncounters";

const goblin = { key: "srd_goblin", name: "Goblin" };
const ogre = { key: "srd_ogre", name: "Ogre" };
const draft = (overrides = {}) => ({
  name: "Ambush",
  ruleset: "5e-2024",
  players: [1, 2],
  extras: [3],
  monsters: [{ creature: goblin, count: 4 }, { creature: ogre, count: 1 }],
  ...overrides,
});
const NOW = new Date("2026-10-10T12:00:00Z");

describe("withEncounter", () => {
  it("saves what it takes to build the encounter again: monsters by key with their names, but not their stat blocks", () => {
    const [saved] = withEncounter([], { ...draft(), monsters: [{ creature: { ...goblin, hitPoints: 7, actions: [{}] }, count: 4 }] }, NOW);

    expect(saved).toEqual({
      id: 1,
      name: "Ambush",
      ruleset: "5e-2024",
      players: [1, 2],
      extras: [3],
      monsters: [{ key: "srd_goblin", name: "Goblin", count: 4 }],
      savedAt: "2026-10-10T12:00:00.000Z",
    });
  });

  it("adds an encounter with a new name, with an id of its own, listed by name", () => {
    const first = withEncounter([], draft({ name: "Zombies" }), NOW);

    const both = withEncounter(first, draft({ name: "Ambush" }), NOW);

    expect(both.map((one) => [one.id, one.name])).toEqual([[2, "Ambush"], [1, "Zombies"]]);
  });

  it("replaces the encounter with the same name, however it is capitalized and spaced, keeping its id", () => {
    const before = withEncounter(withEncounter([], draft({ name: "Ambush" }), NOW), draft({ name: "Dragon" }), NOW);

    const after = withEncounter(before, draft({ name: "  ambush ", monsters: [{ creature: ogre, count: 2 }] }), NOW);

    expect(after).toHaveLength(2);
    expect(after.find((one) => one.id === 1)).toMatchObject({ name: "ambush", monsters: [{ key: "srd_ogre", name: "Ogre", count: 2 }] });
  });

  it("doesn't change what it was given", () => {
    const before = withEncounter([], draft(), NOW);
    const copy = JSON.stringify(before);

    withEncounter(before, draft({ name: "Other" }), NOW);

    expect(JSON.stringify(before)).toBe(copy);
  });
});

describe("withoutEncounter", () => {
  it("drops the one with that id", () => {
    const both = withEncounter(withEncounter([], draft({ name: "A" }), NOW), draft({ name: "B" }), NOW);

    expect(withoutEncounter(both, 1).map((one) => one.name)).toEqual(["B"]);
  });
});

describe("readSaved", () => {
  it("reads what toState made", () => {
    const encounters = withEncounter([], draft(), NOW);

    expect(readSaved(toState(encounters))).toEqual(encounters);
  });

  it("is empty for an account that has none, or anything that isn't saved encounters", () => {
    for (const state of [{}, null, undefined, [], "x", { encounters: "no" }]) {
      expect(readSaved(state)).toEqual([]);
    }
  });

  it("leaves out an entry that isn't an encounter, and the parts of one that aren't right, rather than fail", () => {
    const messy = {
      encounters: [
        null,
        "x",
        { id: "1", name: "string id" },
        { id: 2, name: "  " },
        {
          id: 3,
          name: "Messy",
          players: [1, "two", null],
          extras: "no",
          monsters: [{ key: "a", name: "A", count: 2 }, { key: "b", count: 0 }, { name: "no key", count: 1 }, { key: "c", count: 1 }],
        },
      ],
    };

    expect(readSaved(messy)).toEqual([
      {
        id: 3,
        name: "Messy",
        ruleset: null,
        players: [1],
        extras: [],
        monsters: [{ key: "a", name: "A", count: 2 }, { key: "c", name: "c", count: 1 }],
        savedAt: null,
      },
    ]);
  });
});

describe("names", () => {
  it("are trimmed and kept to a sensible length", () => {
    expect(cleanName("  Ambush  ")).toBe("Ambush");
    expect(cleanName("x".repeat(100))).toHaveLength(60);
    expect(cleanName(null)).toBe("");
  });

  it("say whether one is taken, ignoring capitals", () => {
    const saved = withEncounter([], draft({ name: "Ambush" }), NOW);

    expect(isSaved(saved, " AMBUSH")).toBe(true);
    expect(isSaved(saved, "Other")).toBe(false);
    expect(isSaved(saved, "  ")).toBe(false);
  });

  it("take the next id after the highest", () => {
    expect(nextId([])).toBe(1);
    expect(nextId([{ id: 4 }, { id: 2 }])).toBe(5);
  });
});

describe("summarize", () => {
  it("says what is in it in a line", () => {
    const [saved] = withEncounter([], draft(), NOW);

    expect(summarize(saved)).toBe("4 Goblin, 1 Ogre · 3 characters");
    expect(summarize({ monsters: [], players: [1], extras: [] })).toBe("no creatures · 1 character");
  });
});
