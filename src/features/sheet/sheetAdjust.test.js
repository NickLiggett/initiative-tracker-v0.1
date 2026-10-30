import { describe, expect, it } from "vitest";
import { adjustmentDrafts, adjustmentFor, adjustmentProblems, adjustmentTargets, adjustmentText, adjustmentsToSheet } from "./sheetAdjust";
import { passiveScore, saveBonus, skillBonus, toSheet, toSheetDraft } from "./sheetModel";
import { spellAttackBonus, spellSaveDc } from "./sheetCasting";

const base = {
  abilities: { str: 12, dex: 20, wis: 16 },
  saves: ["dex"],
  skills: { perception: "proficient" },
  spellcasting: { ability: "wis" },
};

describe("adjusting a worked-out number", () => {
  it("adds the bonus to a saving throw, a skill and a passive score", () => {
    const adjusted = {
      ...base,
      adjustments: {
        "save.dex": { bonus: 1, note: "Cloak of Protection" },
        "skill.perception": { bonus: 2 },
        "passive.perception": { bonus: 5, note: "Observant" },
      },
    };

    expect(saveBonus(base, "dex", 14)).toBe(10);
    expect(saveBonus(adjusted, "dex", 14)).toBe(11);
    expect(skillBonus(adjusted, "perception", 14)).toBe(skillBonus(base, "perception", 14) + 2);
    expect(passiveScore(adjusted, "perception", 14)).toBe(passiveScore(base, "perception", 14) + 2 + 5); // its skill's too
  });

  it("adds to the spell save DC and the spell attack bonus separately", () => {
    const adjusted = { ...base, adjustments: { "spell.dc": { bonus: 1 }, "spell.attack": { bonus: 2 } } };

    expect([spellSaveDc(base, 14), spellAttackBonus(base, 14)]).toEqual([16, 8]);
    expect([spellSaveDc(adjusted, 14), spellAttackBonus(adjusted, 14)]).toEqual([17, 10]);
  });

  it("changes nothing for a number that has only a note, and can subtract", () => {
    const adjusted = { ...base, adjustments: { "skill.religion": { note: "Advantage" }, "save.dex": { bonus: -2 } } };

    expect(adjustmentFor(adjusted, "skill.religion")).toEqual({ bonus: 0, note: "Advantage" });
    expect(saveBonus(adjusted, "dex", 14)).toBe(8);
    expect(adjustmentFor(base, "save.str")).toEqual({ bonus: 0, note: "" });
  });

  it("is written beside the number", () => {
    const adjusted = { adjustments: { a: { bonus: 2, note: "Cloak" }, b: { note: "Advantage" }, c: { bonus: -1 } } };

    expect([adjustmentText(adjusted, "a"), adjustmentText(adjusted, "b"), adjustmentText(adjusted, "c"), adjustmentText(adjusted, "d")]).toEqual(["+2 Cloak", "Advantage", "-1", ""]);
  });

  it("can be made for every save, skill, passive score and spell number", () => {
    const keys = adjustmentTargets().map(({ key }) => key);

    expect(keys).toHaveLength(6 + 18 + 3 + 2);
    expect(keys).toEqual(expect.arrayContaining(["save.dex", "skill.sleightOfHand", "passive.insight", "spell.dc", "spell.attack"]));
  });
});

describe("the adjustments in the editor", () => {
  it("come back as the sheet they started from", () => {
    const sheet = { ...base, adjustments: { "save.dex": { bonus: 1, note: "Cloak" }, "skill.religion": { note: "Advantage" } } };

    expect(toSheet(toSheetDraft(sheet), sheet)).toEqual(sheet);
  });

  it("start with no rows, and send none for rows that say nothing, or a bonus of nothing", () => {
    expect(adjustmentDrafts({})).toEqual([]);
    expect(adjustmentsToSheet([{ target: "save.dex", bonus: "", note: "" }, { target: "", bonus: "", note: "" }])).toEqual({});
    expect(adjustmentsToSheet([{ target: "save.dex", bonus: "0", note: "" }])).toEqual({});
    expect(adjustmentsToSheet([{ target: "save.dex", bonus: "+2", note: " Cloak " }])).toEqual({ adjustments: { "save.dex": { bonus: 2, note: "Cloak" } } });
  });

  it("refuse a row with nothing chosen, a number adjusted twice, a bonus that isn't one, and a row with nothing in it", () => {
    expect(adjustmentProblems([{ target: "", bonus: "1", note: "" }])).toEqual(["Choose what each adjustment is for, or remove it."]);
    expect(adjustmentProblems([{ target: "save.dex", bonus: "1", note: "" }, { target: "save.dex", bonus: "2", note: "" }])).toEqual(["Each number is adjusted once; add its bonuses together."]);
    expect(adjustmentProblems([{ target: "save.dex", bonus: "99", note: "" }])).toEqual(["A bonus must be a whole number from -20 to +20."]);
    expect(adjustmentProblems([{ target: "save.dex", bonus: "lots", note: "" }])).toEqual(["A bonus must be a whole number from -20 to +20."]);
    expect(adjustmentProblems([{ target: "save.dex", bonus: "", note: "" }])).toEqual(["Give each adjustment a bonus or a note, or remove it."]);
    expect(adjustmentProblems([{ target: "save.dex", bonus: "", note: "Advantage" }, { target: "skill.religion", bonus: "-3", note: "" }])).toEqual([]);
  });
});
