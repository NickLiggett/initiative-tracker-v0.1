import { describe, expect, it } from "vitest";
import { compareClasses } from "./compareClasses";

const gained = (...levels) => levels.map((level) => ({ level }));
const ability = (name, ...levels) => ({ name, featureType: "CLASS_LEVEL_FEATURE", gainedAt: gained(...levels) });

const fighter = {
  name: "Fighter",
  hitDice: "D10",
  casterType: "NONE",
  savingThrows: [{ name: "Strength" }, { name: "Constitution" }],
  primaryAbilities: [],
  features: [ability("Second Wind", 1), ability("Action Surge", 2), ability("Extra Attack", 5), ability("Ability Score Improvement", 4, 6)],
};
const wizard = {
  name: "Wizard",
  hitDice: "D6",
  casterType: "FULL",
  savingThrows: [{ name: "Intelligence" }, { name: "Wisdom" }],
  primaryAbilities: [{ name: "Intelligence" }],
  features: [ability("Spellcasting", 1), ability("Arcane Tradition", 2), ability("Ability Score Improvement", 4)],
};

const rowsOf = (sections, title) => sections.find((section) => section.title === title).rows;

describe("compareClasses", () => {
  it("lines up the hit die, saves, primary ability and spellcasting", () => {
    const overview = rowsOf(compareClasses(fighter, wizard), "Overview");

    expect(overview.map((row) => [row.label, ...row.values])).toEqual([
      ["Hit die", "d10", "d6"],
      ["Saving throws", "Strength, Constitution", "Intelligence, Wisdom"],
      ["Primary ability", "—", "Intelligence"],
      ["Spellcasting", "Not a spellcaster", "Full caster"],
    ]);
  });

  it("lines up what each gains at each level, leaving out the levels where neither gains anything", () => {
    const levels = rowsOf(compareClasses(fighter, wizard), "Features by level");

    expect(levels.map((row) => [row.label, ...row.values])).toEqual([
      ["Level 1", "Second Wind", "Spellcasting"],
      ["Level 2", "Action Surge", "Arcane Tradition"],
      ["Level 4", "Ability Score Improvement", "Ability Score Improvement"],
      ["Level 5", "Extra Attack", "—"],
      ["Level 6", "Ability Score Improvement", "—"],
    ]);
    expect(levels.find((row) => row.label === "Level 4").differs).toBe(false);
  });

  it("leaves out a row neither class says anything for", () => {
    const overview = rowsOf(compareClasses({ ...fighter, primaryAbilities: [] }, { ...wizard, primaryAbilities: [] }), "Overview");

    expect(overview.map((row) => row.label)).not.toContain("Primary ability");
  });
});
