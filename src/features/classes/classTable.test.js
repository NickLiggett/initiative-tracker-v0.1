import { describe, expect, it } from "vitest";
import { casterLabel, describeResult, hitDie, levelsText, names } from "./classFormat";
import { classAbilities, levelTable, levelsOf, textOf } from "./classTable";

const gained = (...levels) => levels.map((level) => ({ level, detail: null }));
const column = (...pairs) => pairs.map(([level, columnValue]) => ({ level, columnValue }));

const wizard = {
  key: "srd_wizard",
  name: "Wizard",
  subclassOf: null,
  features: [
    { key: "w-slots-2nd", name: "2nd", featureType: "SPELL_SLOTS", gainedAt: [], dataForClassTable: column([3, "2"], [4, "3"]) },
    { key: "w-slots-1st", name: "1st", featureType: "SPELL_SLOTS", gainedAt: [], dataForClassTable: column([1, "2"], [2, "3"], [3, "4"], [4, "4"]) },
    { key: "w-cantrips", name: "Cantrips Known", featureType: "CLASS_TABLE_DATA", gainedAt: [], dataForClassTable: column([1, "3"], [4, "4"]) },
    { key: "w-pb", name: "Proficiency Bonus", featureType: "PROFICIENCY_BONUS", gainedAt: [], dataForClassTable: column([1, "+2"], [2, "+2"], [3, "+2"], [4, "+2"]) },
    { key: "w-asi", name: "Ability Score Improvement", featureType: "CLASS_LEVEL_FEATURE", desc: "Raise a score.", gainedAt: gained(8, 4) },
    { key: "w-arcane", name: "Arcane Recovery", featureType: "CLASS_LEVEL_FEATURE", desc: "Recover slots.", gainedAt: gained(1) },
    { key: "w-spellcasting", name: "Spellcasting", featureType: "CLASS_LEVEL_FEATURE", desc: "You cast spells.", gainedAt: gained(1) },
    { key: "w-tradition", name: "Arcane Tradition", featureType: "CLASS_LEVEL_FEATURE", desc: "Choose a school.", gainedAt: gained(2) },
    { key: "w-profs", name: "Proficiencies", featureType: "PROFICIENCIES", desc: "**Armor:** None", gainedAt: [] },
    { key: "w-equipment", name: "Equipment", featureType: "STARTING_EQUIPMENT", desc: "A quarterstaff.", gainedAt: [] },
  ],
};

describe("levelsOf", () => {
  it("gives the levels once each, lowest first, however the source lists them", () => {
    expect(levelsOf({ gainedAt: gained(12, 4, 8, 4) })).toEqual([4, 8, 12]);
    expect(levelsOf({ gainedAt: [{ level: null }, { detail: "x" }] })).toEqual([]);
    expect(levelsOf({})).toEqual([]);
  });
});

describe("classAbilities", () => {
  it("is the abilities, not the columns or blocks of text, by the level first gained and then by name", () => {
    expect(classAbilities(wizard).map((ability) => [ability.name, ability.levels])).toEqual([
      ["Arcane Recovery", [1]],
      ["Spellcasting", [1]],
      ["Arcane Tradition", [2]],
      ["Ability Score Improvement", [4, 8]],
    ]);
  });

  it("puts one gained at no level last", () => {
    const cls = { features: [{ name: "Z Always", featureType: "CLASS_LEVEL_FEATURE", gainedAt: [] }, { name: "A Early", featureType: "CLASS_LEVEL_FEATURE", gainedAt: gained(1) }] };

    expect(classAbilities(cls).map((ability) => ability.name)).toEqual(["A Early", "Z Always"]);
  });
});

describe("textOf", () => {
  it("is the text of the feature of that type, or nothing", () => {
    expect(textOf(wizard, "PROFICIENCIES")).toBe("**Armor:** None");
    expect(textOf(wizard, "STARTING_EQUIPMENT")).toBe("A quarterstaff.");
    expect(textOf(wizard, "CORE_TRAITS_TABLE")).toBe("");
    expect(textOf({}, "PROFICIENCIES")).toBe("");
  });
});

describe("levelTable", () => {
  it("has the columns in order: the proficiency bonus, the class's own, then the slots by spell level", () => {
    const { columns } = levelTable(wizard);

    expect(columns.map((one) => [one.label, one.group])).toEqual([
      ["Proficiency Bonus", null],
      ["Cantrips Known", null],
      ["1st", "Spell slots"],
      ["2nd", "Spell slots"],
    ]);
  });

  it("has a row for each level, as far as the class goes, with the abilities gained and the value of each column", () => {
    const { rows } = levelTable(wizard);

    expect(rows.map((row) => row.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // the last ability is gained at level 8
    expect(rows[0]).toMatchObject({ level: 1, features: ["Arcane Recovery", "Spellcasting"] });
    expect(rows[0].values).toEqual({ "w-pb": "+2", "w-cantrips": "3", "w-slots-1st": "2", "w-slots-2nd": "—" });
    expect(rows[2].values).toMatchObject({ "w-slots-1st": "4", "w-slots-2nd": "2" });
    expect(rows[3].features).toEqual(["Ability Score Improvement"]);
    expect(rows[4].features).toEqual([]);
  });

  it("goes to level 20 for a class that has a value up to it", () => {
    const cls = { features: [{ key: "pb", name: "Proficiency Bonus", featureType: "PROFICIENCY_BONUS", dataForClassTable: column([20, "+6"]) }] };

    expect(levelTable(cls).rows).toHaveLength(20);
  });

  it("is 20 rows for a class that says nothing of levels, and never more", () => {
    expect(levelTable({ features: [] }).rows).toHaveLength(20);
    expect(levelTable({ features: [{ name: "Odd", featureType: "CLASS_LEVEL_FEATURE", gainedAt: gained(25) }] }).rows).toHaveLength(20);
  });

  it("is nothing for a subclass, which has no table", () => {
    expect(levelTable({ subclassOf: { key: "srd_wizard", name: "Wizard" }, features: [] })).toBeNull();
  });
});

describe("showing a class", () => {
  it("says what kind of caster", () => {
    expect(casterLabel("FULL")).toBe("Full caster");
    expect(casterLabel("NONE")).toBe("Not a spellcaster");
    expect(casterLabel(null)).toBe("");
    expect(casterLabel("SOMETHING")).toBe("");
  });

  it("writes the hit die in lower case, from the hit points when they say", () => {
    expect(hitDie({ hitDice: "D8" })).toBe("d8");
    expect(hitDie({ hitDice: "D8", hitPoints: { hitDice: "D10" } })).toBe("d10");
    expect(hitDie({})).toBe("");
  });

  it("lists names", () => {
    expect(names([{ name: "Intelligence" }, { name: "Wisdom" }])).toBe("Intelligence, Wisdom");
    expect(names(null)).toBe("");
  });

  it("says what a result is and where it is from", () => {
    expect(describeResult({ document: { displayName: "5e 2014 Rules" } })).toBe("Class · 5e 2014 Rules");
    expect(describeResult({ subclassOf: { name: "Wizard" }, document: { name: "Tome of Heroes" } })).toBe("Subclass of Wizard · Tome of Heroes");
  });

  it("says the levels of a feature", () => {
    expect(levelsText([])).toBe("");
    expect(levelsText([5])).toBe("Level 5");
    expect(levelsText([4, 8, 12])).toBe("Levels 4, 8 and 12");
    expect(levelsText([9, 13])).toBe("Levels 9 and 13");
  });
});
