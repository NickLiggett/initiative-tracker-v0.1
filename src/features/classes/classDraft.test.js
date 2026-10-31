import { describe, expect, it } from "vitest";
import { blankClassDraft, classFromDraft, classProblems, draftFromClass, parseLevels, proficiencyBonusAt } from "./classDraft";

const gained = (...levels) => levels.map((level) => ({ level, detail: null }));

const wizard = {
  key: "srd_wizard",
  name: "Wizard",
  desc: "A scholar.",
  hitDice: "D6",
  casterType: "FULL",
  subclassOf: null,
  savingThrows: [{ name: "Intelligence" }, { key: "wisdom", name: "Wisdom" }],
  primaryAbilities: [{ name: "Intelligence" }],
  hitPoints: { hitDice: "D6", hitPointsAt1stLevel: "6 + Con", hitPointsAtHigherLevels: "1d6 + Con" },
  features: [
    { key: "pb", name: "Proficiency Bonus", featureType: "PROFICIENCY_BONUS", dataForClassTable: [{ level: 1, columnValue: "+2" }] },
    { key: "cantrips", name: "Cantrips Known", featureType: "CLASS_TABLE_DATA", dataForClassTable: [{ level: 1, columnValue: "3" }, { level: 4, columnValue: "4" }] },
    { key: "slots-1", name: "1st", featureType: "SPELL_SLOTS", dataForClassTable: [{ level: 1, columnValue: "2" }] },
    { key: "profs", name: "Proficiencies", featureType: "PROFICIENCIES", desc: "None." },
    { key: "recovery", name: "Arcane Recovery", featureType: "CLASS_LEVEL_FEATURE", desc: "Recover slots.", gainedAt: gained(1) },
    { key: "asi", name: "Ability Score Improvement", featureType: "CLASS_LEVEL_FEATURE", desc: "Raise scores.", gainedAt: gained(8, 4) },
  ],
};

describe("parseLevels", () => {
  it("reads the levels in text, once each and lowest first", () => {
    expect(parseLevels("9, 1 and 5; 5")).toEqual([1, 5, 9]);
    expect(parseLevels("")).toEqual([]);
  });

  it("gives NaN for what isn't a level", () => {
    expect(parseLevels("1, soon").some(Number.isNaN)).toBe(true);
  });
});

describe("proficiencyBonusAt", () => {
  it("is +2 at 1st and up one every four levels", () => {
    expect([1, 4, 5, 9, 13, 17, 20].map(proficiencyBonusAt)).toEqual(["+2", "+2", "+3", "+4", "+5", "+6", "+6"]);
  });
});

describe("a class as a draft", () => {
  it("reads a class from a source: its abilities, text, table columns and the rest kept", () => {
    const draft = draftFromClass(wizard);

    expect(draft).toMatchObject({ name: "Wizard", hitDie: "D6", casterType: "FULL", proficiencyBonus: true, proficiencies: "None.", hpFirst: "6 + Con" });
    expect(draft.savingThrows).toEqual(["intelligence", "wisdom"]); // by name or by key
    expect(draft.columns).toEqual([{ name: "Cantrips Known", values: "3\n\n\n4" }]);
    expect(draft.features.map((feature) => [feature.name, feature.levels])).toEqual([["Arcane Recovery", "1"], ["Ability Score Improvement", "4, 8"]]);
    expect(draft.kept.map((feature) => feature.key)).toEqual(["slots-1"]);
  });

  it("goes back to what the backend takes, keeping the spell slots and giving every feature a key", () => {
    const body = classFromDraft(draftFromClass(wizard));

    expect(body).toMatchObject({ name: "Wizard", hitDice: "D6", casterType: "FULL", subclassOf: null });
    expect(body.savingThrows).toEqual([{ key: "intelligence", name: "Intelligence" }, { key: "wisdom", name: "Wisdom" }]);
    expect(body.hitPoints).toEqual({ hitDice: "D6", hitDiceName: "d6", hitPointsAt1stLevel: "6 + Con", hitPointsAtHigherLevels: "1d6 + Con" });
    expect(body.features.find((feature) => feature.featureType === "SPELL_SLOTS")).toEqual(wizard.features[2]);
    expect(body.features.find((feature) => feature.featureType === "CLASS_TABLE_DATA").dataForClassTable).toEqual([
      { level: 1, columnValue: "3" },
      { level: 4, columnValue: "4" },
    ]);
    expect(body.features.find((feature) => feature.name === "Ability Score Improvement")).toMatchObject({ key: "ability-score-improvement", gainedAt: gained(4, 8) });
    expect(body.features.find((feature) => feature.featureType === "PROFICIENCY_BONUS").dataForClassTable).toHaveLength(20);
  });

  it("makes a subclass with no table, hit points or abilities of its own", () => {
    const draft = { ...blankClassDraft(), name: "Order of Dusk", subclassOfKey: "srd_wizard", subclassOfName: "Wizard", hitDie: "D12", savingThrows: ["strength"], core: "x", features: [{ name: "Dusk Step", levels: "3", desc: "You step." }] };

    expect(classFromDraft(draft)).toMatchObject({
      subclassOf: { key: "srd_wizard", name: "Wizard" },
      hitDice: null,
      hitPoints: null,
      savingThrows: [],
      primaryAbilities: [],
      features: [{ key: "dusk-step", name: "Dusk Step", featureType: "CLASS_LEVEL_FEATURE", gainedAt: gained(3) }],
    });
  });

  it("gives features with the same name different keys", () => {
    const draft = { ...blankClassDraft(), name: "X", features: [{ name: "Strike", levels: "1", desc: "" }, { name: "Strike!", levels: "2", desc: "" }] };

    expect(classFromDraft(draft).features.filter((feature) => feature.featureType === "CLASS_LEVEL_FEATURE").map((feature) => feature.key)).toEqual(["strike", "strike-2"]);
  });

  it("leaves a feature with no levels without any", () => {
    const draft = { ...blankClassDraft(), name: "X", features: [{ name: "Lore", levels: "", desc: "Text." }] };

    expect(classFromDraft(draft).features[0].gainedAt).toBeUndefined();
  });
});

describe("what stops a class from being saved", () => {
  const ok = { ...blankClassDraft(), name: "X" };

  it("is nothing for a class with a name", () => {
    expect(classProblems(ok)).toEqual([]);
  });

  it("is a missing name, a nameless feature or column, levels that aren't, too many table lines and a repeated name", () => {
    expect(classProblems(blankClassDraft())).toEqual(["Give the class a name."]);
    expect(classProblems({ ...ok, features: [{ name: "", levels: "", desc: "" }] })).toEqual(["Give each feature a name, or remove it."]);
    expect(classProblems({ ...ok, features: [{ name: "A", levels: "0, 21", desc: "" }] })).toEqual(["A feature's levels are whole numbers from 1 to 20, such as 1, 5, 9."]);
    expect(classProblems({ ...ok, columns: [{ name: "", values: "" }] })).toEqual(["Give each table column a name, or remove it."]);
    expect(classProblems({ ...ok, columns: [{ name: "Grit", values: Array(21).fill("1").join("\n") }] })).toEqual(["A table column has a value for each level, so up to 20 lines."]);
    expect(classProblems({ ...ok, features: [{ name: "A", levels: "1", desc: "" }, { name: "a", levels: "2", desc: "" }] })).toEqual(["Two features have the same name; tell them apart."]);
  });
});
