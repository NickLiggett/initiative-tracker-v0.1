import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT, draftProblems, duplicateDraft, previewOf, toDraft, toRequest } from "./playerDraft";

const player = {
  id: 4,
  name: "Thorin",
  ruleset: "5e-2014",
  classKey: "srd_fighter",
  className: "Fighter",
  speciesKey: null,
  speciesName: "Dwarf",
  level: 5,
  armorClass: 18,
  hitPoints: null,
  initiativeBonus: -1,
  notes: null,
  owner: "dm",
  playedBy: "anna",
  role: "OWNER",
};

describe("toDraft", () => {
  it("turns numbers into the text typed, and nothing into empty text", () => {
    expect(toDraft(player)).toEqual({
      name: "Thorin",
      ruleset: "5e-2014",
      classes: [{ key: "srd_fighter", name: "Fighter", level: "5" }],
      speciesKey: null,
      speciesName: "Dwarf",
      armorClass: "18",
      hitPoints: "",
      initiativeBonus: "-1",
      notes: "",
      playedBy: "anna",
    });
  });
});

describe("toDraft for a multiclass character", () => {
  it("has a row for each class, and one row for a character that has none", () => {
    const mixed = { ...player, level: 5, classes: [{ classKey: "srd_fighter", className: "Fighter", level: 3 }, { classKey: null, className: "Wizard", level: 2 }] };

    expect(toDraft(mixed).classes).toEqual([
      { key: "srd_fighter", name: "Fighter", level: "3" },
      { key: null, name: "Wizard", level: "2" },
    ]);
    expect(toDraft({ ...player, classKey: null, className: null, level: 4 }).classes).toEqual([{ key: null, name: "", level: "4" }]);
  });
});

describe("duplicateDraft", () => {
  it("is the same player with a new name and nobody playing it", () => {
    expect(duplicateDraft(player)).toEqual({ ...toDraft(player), name: "Thorin (copy)", playedBy: "" });
  });
});

describe("draftProblems", () => {
  const ok = { ...EMPTY_DRAFT, name: "Aria" };

  it("is none for a name and the rules' defaults", () => {
    expect(draftProblems(ok)).toEqual([]);
  });

  it("wants a name", () => {
    expect(draftProblems({ ...ok, name: "   " })).toEqual(["Give the character a name."]);
  });

  it("keeps the numbers in range, letting armor class and hit points be empty", () => {
    const level = (text) => ({ ...ok, classes: [{ key: null, name: "", level: text }] });
    expect(draftProblems(level("0"))).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems(level("21"))).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems(level(""))).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems(level("2.5"))).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems({ ...ok, armorClass: "41" })).toEqual(["Armor class must be 0 to 40."]);
    expect(draftProblems({ ...ok, armorClass: "" })).toEqual([]);
    expect(draftProblems({ ...ok, hitPoints: "10000" })).toEqual(["Hit points must be 0 to 9999."]);
    expect(draftProblems({ ...ok, initiativeBonus: "+3" })).toEqual([]);
    expect(draftProblems({ ...ok, initiativeBonus: "31" })).toEqual(["Initiative bonus must be -10 to 30."]);
    expect(draftProblems({ ...ok, initiativeBonus: "" })).toEqual(["Initiative bonus must be -10 to 30."]);
  });

  it("keeps each class's level in range, and all of them together to 20", () => {
    const row = (name, level) => ({ key: null, name, level });

    expect(draftProblems({ ...ok, classes: [row("Fighter", "3"), row("Wizard", "2")] })).toEqual([]);
    expect(draftProblems({ ...ok, classes: [row("Fighter", "0"), row("Wizard", "2")] })).toEqual(["Level in Fighter must be 1 to 20."]);
    expect(draftProblems({ ...ok, classes: [row("Fighter", "12"), row("Wizard", "9")] })).toEqual(["The levels add up to 21; 20 is the most."]);
    expect(draftProblems({ ...ok, classes: [row("Fighter", "12"), row("Wizard", "8")] })).toEqual([]);
  });

  it("wants each class named once, and no empty row among several", () => {
    const row = (name, level = "1") => ({ key: null, name, level });

    expect(draftProblems({ ...ok, classes: [row("Fighter"), row(" fighter ")] })).toEqual(["Fighter is listed twice; use one row and add up its levels."]);
    expect(draftProblems({ ...ok, classes: [row("Fighter"), row("")] })).toEqual(["Name each class, or remove the empty one."]);
  });

  it("wants a username that could be one", () => {
    expect(draftProblems({ ...ok, playedBy: "@Anna-2" })).toEqual([]);
    expect(draftProblems({ ...ok, playedBy: "a b" })).toEqual(["The player's username has letters, digits and hyphens only."]);
    expect(draftProblems({ ...ok, playedBy: "anna@example.com" })).toHaveLength(1);
  });
});

describe("toRequest", () => {
  it("sends trimmed text, numbers, and nothing for what is empty", () => {
    expect(toRequest({ ...toDraft(player), name: "  Thorin ", armorClass: "", initiativeBonus: "+2", playedBy: " @Anna " })).toEqual({
      name: "Thorin",
      ruleset: "5e-2014",
      classKey: "srd_fighter",
      className: "Fighter",
      classes: [{ classKey: "srd_fighter", className: "Fighter", level: 5 }],
      speciesKey: null,
      speciesName: "Dwarf",
      level: 5,
      armorClass: null,
      hitPoints: null,
      initiativeBonus: 2,
      notes: null,
      playedBy: "anna",
    });
  });

  it("drops a class whose name was cleared, keeping the level", () => {
    const request = toRequest({ ...toDraft(player), classes: [{ key: "srd_fighter", name: "  ", level: "5" }] });

    expect(request).toMatchObject({ className: null, classKey: null, classes: [], level: 5 });
  });

  it("sends every class, the first one as the class, and the levels added up", () => {
    const request = toRequest({
      ...toDraft(player),
      classes: [
        { key: "srd_fighter", name: " Fighter ", level: "3" },
        { key: null, name: "Wizard", level: "2" },
        { key: null, name: "", level: "1" },
      ],
    });

    expect(request).toMatchObject({
      classKey: "srd_fighter",
      className: "Fighter",
      level: 5,
      classes: [
        { classKey: "srd_fighter", className: "Fighter", level: 3 },
        { classKey: null, className: "Wizard", level: 2 },
      ],
    });
  });
});

describe("previewOf", () => {
  it("shows what has been typed so far, even when it can't be saved yet", () => {
    const preview = previewOf({ ...EMPTY_DRAFT, name: "", classes: [{ key: null, name: "", level: "" }], armorClass: "x", initiativeBonus: "" }, null);

    expect(preview).toMatchObject({ name: "Unnamed character", level: 1, armorClass: null, initiativeBonus: 0, role: "OWNER" });
  });

  it("keeps who made it and the user's part when changing one", () => {
    expect(previewOf(toDraft(player), { ...player, role: "PLAYER" })).toMatchObject({ owner: "dm", role: "PLAYER", id: 4 });
  });
});
