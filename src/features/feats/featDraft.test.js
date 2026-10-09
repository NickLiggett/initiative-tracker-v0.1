import { describe, expect, it } from "vitest";
import { blankFeatDraft, draftFromFeat, featFromDraft, featProblems, newBenefit } from "./featDraft";
import { describeResult, featTypeLabel } from "./featFormat";

const alert = {
  key: "srd-2024_alert",
  name: "Alert",
  type: "Origin",
  hasPrerequisite: false,
  prerequisite: null,
  desc: "",
  benefits: [{ desc: "You add your proficiency bonus to initiative." }],
};

describe("a feat draft", () => {
  it("starts as a general feat with nothing else", () => {
    expect(blankFeatDraft()).toEqual({ name: "", type: "General", prerequisite: "", desc: "", benefits: [] });
  });

  it("starts from a feat", () => {
    const draft = draftFromFeat(alert);

    expect(draft).toMatchObject({ name: "Alert", type: "Origin", prerequisite: "", benefits: [{ desc: "You add your proficiency bonus to initiative." }] });
  });

  it("has a prerequisite exactly when one is written", () => {
    const base = { ...blankFeatDraft(), name: "Grappler" };

    expect(featFromDraft({ ...base, prerequisite: "  Strength 13 or higher " })).toMatchObject({ hasPrerequisite: true, prerequisite: "Strength 13 or higher" });
    expect(featFromDraft({ ...base, prerequisite: "   " })).toMatchObject({ hasPrerequisite: false, prerequisite: null });
  });

  it("becomes a body, with no type or description when they're empty", () => {
    const draft = { name: " Lucky ", type: "", prerequisite: "", desc: " ", benefits: [{ ...newBenefit(), desc: " Reroll a die. " }] };

    expect(featFromDraft(draft)).toEqual({
      name: "Lucky",
      type: null,
      hasPrerequisite: false,
      prerequisite: null,
      desc: null,
      benefits: [{ name: null, desc: "Reroll a die.", type: null, crossreferences: null }],
    });
  });

  it("says what is wrong with it", () => {
    expect(featProblems(blankFeatDraft())).toEqual(["Give the feat a name."]);
    expect(featProblems({ ...blankFeatDraft(), name: "X", benefits: [newBenefit()] })).toEqual(["Benefit 1 needs a description."]);
    expect(featProblems({ ...blankFeatDraft(), name: "X" })).toEqual([]);
  });
});

describe("showing a feat", () => {
  it("writes a type in capitals the way the others are written", () => {
    expect(featTypeLabel("GENERAL")).toBe("General");
    expect(featTypeLabel("Fighting Style")).toBe("Fighting Style");
    expect(featTypeLabel(null)).toBe("");
  });

  it("says its kind and source under a result's name", () => {
    expect(describeResult({ type: "GENERAL", document: { displayName: "5e 2024 Rules" } })).toBe("General feat · 5e 2024 Rules");
    expect(describeResult({ document: { name: "Mine" } })).toBe("Mine");
  });
});
