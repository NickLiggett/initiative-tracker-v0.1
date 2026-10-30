import { describe, expect, it } from "vitest";
import { attackDrafts, attacksToSheet, featureDrafts, featuresToSheet, listProblems, restWouldHelp, spendUse, takeRest, usesLeft } from "./sheetEntries";
import { toSheet, toSheetDraft } from "./sheetModel";

const sheet = {
  attacks: [{ name: "Longsword", bonus: "+9", damage: "1d8+5 slashing", notes: "Rite of the Flame adds 1d6 fire" }],
  features: [
    { name: "Blood Maledict", source: "Blood Hunter", description: "Curse a creature.", uses: { max: 2, used: 1, per: "short" } },
    { name: "Revealed Arcana", uses: { max: 1, used: 1, per: "long" } },
    { name: "Extra Attack" },
  ],
};

describe("the lists as the editor works on them", () => {
  it("come back as the sheet they started from", () => {
    expect(toSheet(toSheetDraft(sheet), sheet)).toEqual(sheet);
  });

  it("leave out rows that are empty, and trim what is written", () => {
    expect(attacksToSheet([{ name: "  Dagger ", bonus: "", damage: "1d4", notes: "" }, { name: "", bonus: "", damage: "", notes: "" }])).toEqual([
      { name: "Dagger", damage: "1d4" },
    ]);
    expect(featuresToSheet([{ name: "Second Wind", source: "", description: "", max: "1", per: "short", used: "0" }, { name: "", source: "", description: "", max: "", per: "", used: "0" }])).toEqual([
      { name: "Second Wind", uses: { max: 1, used: 0, per: "short" } },
    ]);
  });

  it("never keep more uses spent than a feature has", () => {
    expect(featuresToSheet([{ name: "X", source: "", description: "", max: "2", per: "long", used: "5" }])[0].uses.used).toBe(2);
  });

  it("start empty for a sheet without them", () => {
    expect([attackDrafts(undefined), featureDrafts(undefined)]).toEqual([[], []]);
  });
});

describe("what stops the lists from being saved", () => {
  const base = { attacks: [], features: [] };

  it("is nothing for empty lists, and for rows left empty", () => {
    expect(listProblems(base)).toEqual([]);
    expect(listProblems({ attacks: [{ name: "", bonus: "", damage: "", notes: "" }], features: [] })).toEqual([]);
  });

  it("is a row with something written but no name", () => {
    expect(listProblems({ ...base, attacks: [{ name: "", bonus: "+5", damage: "", notes: "" }] })).toEqual(["Give each attack a name, or remove it."]);
    expect(listProblems({ ...base, features: [{ name: "", source: "Feat", description: "", max: "", per: "", used: "0" }] })).toEqual(["Give each feature a name, or remove it."]);
  });

  it("is uses that aren't a number from 1 to 99, or that don't say when they come back", () => {
    const row = { name: "X", source: "", description: "", max: "0", per: "short", used: "0" };

    expect(listProblems({ ...base, features: [row] })).toEqual(["Uses must be 1 to 99, or left empty for a feature that isn't limited."]);
    expect(listProblems({ ...base, features: [{ ...row, max: "2", per: "" }] })).toEqual(["Say when the uses come back (short rest or long rest), or clear the uses."]);
  });
});

describe("spending uses and taking rests", () => {
  it("count the uses left, or none for a feature that isn't limited", () => {
    expect(usesLeft(sheet.features[0])).toBe(1);
    expect(usesLeft(sheet.features[2])).toBeNull();
  });

  it("spend a use, or give one back, within what the feature has", () => {
    expect(spendUse(sheet, 0, 1).features[0].uses.used).toBe(2);
    expect(spendUse(spendUse(sheet, 0, 1), 0, 1).features[0].uses.used).toBe(2);
    expect(spendUse(sheet, 0, -1).features[0].uses.used).toBe(0);
    expect(spendUse(spendUse(sheet, 0, -1), 0, -1).features[0].uses.used).toBe(0);
    expect(spendUse(sheet, 2, 1)).toEqual(sheet); // not limited: nothing to spend
  });

  it("give back on a short rest only what comes back on one, and on a long rest everything", () => {
    const short = takeRest(sheet, "short");
    const long = takeRest(sheet, "long");

    expect(short.features.map((feature) => feature.uses?.used)).toEqual([0, 1, undefined]);
    expect(long.features.map((feature) => feature.uses?.used)).toEqual([0, 0, undefined]);
  });

  it("know whether a rest would give anything back", () => {
    expect(restWouldHelp(sheet, "short")).toBe(true);
    expect(restWouldHelp(takeRest(sheet, "short"), "short")).toBe(false);
    expect(restWouldHelp(takeRest(sheet, "short"), "long")).toBe(true);
    expect(restWouldHelp(takeRest(sheet, "long"), "long")).toBe(false);
  });

  it("do not change the sheet they were given", () => {
    const before = JSON.stringify(sheet);

    spendUse(sheet, 0, 1);
    takeRest(sheet, "long");

    expect(JSON.stringify(sheet)).toBe(before);
  });
});
