import { describe, expect, it } from "vitest";
import { blankSpeciesDraft, draftFromSpecies, moveItem, newTrait, speciesFromDraft, speciesProblems } from "./speciesDraft";

const dwarf = {
  key: "srd_dwarf",
  name: "Dwarf",
  desc: "Sturdy.",
  isSubspecies: false,
  subspeciesOfKey: null,
  traits: [
    { name: "Ability Score Increase", desc: "**_Ability Score Increase._** +2 Con.", type: null, order: null, crossreferences: { to: [] } },
    { name: "Speed", desc: "25 feet.", type: "SPEED", order: 2 },
  ],
};

describe("draftFromSpecies", () => {
  it("copies what the form shows, with an id for each trait, and keeps a trait's type and order", () => {
    const draft = draftFromSpecies(dwarf);

    expect(draft).toMatchObject({ name: "Dwarf", desc: "Sturdy.", isSubspecies: false, subspeciesOfKey: null });
    expect(draft.traits).toHaveLength(2);
    expect(new Set(draft.traits.map((trait) => trait.id)).size).toBe(2);
    expect(draft.traits[1]).toMatchObject({ name: "Speed", type: "SPEED", order: 2 });
  });

  it("copes with a species that has no traits or text", () => {
    expect(draftFromSpecies({ name: "Odd" })).toEqual({ name: "Odd", desc: "", isSubspecies: false, subspeciesOfKey: null, traits: [] });
  });
});

describe("speciesFromDraft", () => {
  it("is what the backend takes, trimmed, without the form's ids", () => {
    const draft = { ...draftFromSpecies(dwarf), name: "  Dwarf II ", desc: "  " };

    expect(speciesFromDraft(draft)).toEqual({
      name: "Dwarf II",
      desc: null,
      isSubspecies: false,
      subspeciesOfKey: null,
      traits: [
        { name: "Ability Score Increase", desc: "**_Ability Score Increase._** +2 Con.", type: null, order: null },
        { name: "Speed", desc: "25 feet.", type: "SPEED", order: 2 },
      ],
    });
  });

  it("keeps the parent only while it is a subspecies", () => {
    const sub = { ...blankSpeciesDraft(), name: "Hill", isSubspecies: true, subspeciesOfKey: "srd_dwarf" };

    expect(speciesFromDraft(sub).subspeciesOfKey).toBe("srd_dwarf");
    expect(speciesFromDraft({ ...sub, isSubspecies: false }).subspeciesOfKey).toBeNull();
  });
});

describe("speciesProblems", () => {
  const ok = { ...blankSpeciesDraft(), name: "Gnoll" };

  it("is none for a name alone", () => {
    expect(speciesProblems(ok)).toEqual([]);
  });

  it("wants a name", () => {
    expect(speciesProblems({ ...ok, name: "  " })).toEqual(["Give the species a name."]);
  });

  it("wants a parent for a subspecies", () => {
    expect(speciesProblems({ ...ok, isSubspecies: true })).toEqual(["Choose the species this is a subspecies of."]);
    expect(speciesProblems({ ...ok, isSubspecies: true, subspeciesOfKey: "srd_dwarf" })).toEqual([]);
  });

  it("wants every trait to have a name and a description, and says which", () => {
    const traits = [newTrait({ name: "Fine", desc: "ok" }), newTrait({ name: "No text" }), newTrait({ desc: "No name" })];

    expect(speciesProblems({ ...ok, traits })).toEqual(["Trait 2 needs a name and a description.", "Trait 3 needs a name and a description."]);
  });
});

describe("moveItem", () => {
  it("moves one item to a place, without changing the list it was given", () => {
    const list = ["a", "b", "c"];

    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(list, 2, 1)).toEqual(["a", "c", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("is the same list when it isn't a move", () => {
    const list = ["a", "b"];

    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
    expect(moveItem(list, 0, 2)).toBe(list);
  });
});
