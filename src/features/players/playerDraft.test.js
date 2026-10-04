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
      classKey: "srd_fighter",
      className: "Fighter",
      speciesKey: null,
      speciesName: "Dwarf",
      level: "5",
      armorClass: "18",
      hitPoints: "",
      initiativeBonus: "-1",
      notes: "",
      playedBy: "anna",
    });
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
    expect(draftProblems({ ...ok, name: "   " })).toEqual(["Give the player a name."]);
  });

  it("keeps the numbers in range, letting armor class and hit points be empty", () => {
    expect(draftProblems({ ...ok, level: "0" })).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems({ ...ok, level: "21" })).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems({ ...ok, level: "" })).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems({ ...ok, level: "2.5" })).toEqual(["Level must be 1 to 20."]);
    expect(draftProblems({ ...ok, armorClass: "41" })).toEqual(["Armor class must be 0 to 40."]);
    expect(draftProblems({ ...ok, armorClass: "" })).toEqual([]);
    expect(draftProblems({ ...ok, hitPoints: "10000" })).toEqual(["Hit points must be 0 to 9999."]);
    expect(draftProblems({ ...ok, initiativeBonus: "+3" })).toEqual([]);
    expect(draftProblems({ ...ok, initiativeBonus: "31" })).toEqual(["Initiative bonus must be -10 to 30."]);
    expect(draftProblems({ ...ok, initiativeBonus: "" })).toEqual(["Initiative bonus must be -10 to 30."]);
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

  it("drops a key whose name was cleared", () => {
    const request = toRequest({ ...toDraft(player), className: "  " });

    expect(request.className).toBeNull();
    expect(request.classKey).toBeNull();
  });
});

describe("previewOf", () => {
  it("shows what has been typed so far, even when it can't be saved yet", () => {
    const preview = previewOf({ ...EMPTY_DRAFT, name: "", level: "", armorClass: "x", initiativeBonus: "" }, null);

    expect(preview).toMatchObject({ name: "Unnamed player", level: 1, armorClass: null, initiativeBonus: 0, role: "OWNER" });
  });

  it("keeps who made it and the user's part when changing one", () => {
    expect(previewOf(toDraft(player), { ...player, role: "PLAYER" })).toMatchObject({ owner: "dm", role: "PLAYER", id: 4 });
  });
});
