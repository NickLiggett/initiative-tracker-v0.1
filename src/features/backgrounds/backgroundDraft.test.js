import { describe, expect, it } from "vitest";
import { backgroundFromDraft, backgroundProblems, blankBackgroundDraft, draftFromBackground, newBenefit } from "./backgroundDraft";
import { benefitTypeLabel } from "./backgroundFormat";

const acolyte = {
  key: "srd_acolyte",
  name: "Acolyte",
  desc: "You served a temple.",
  benefits: [
    { name: "Skill Proficiencies", desc: "Insight, Religion", type: "skill_proficiency", crossreferences: { to: [] } },
    { name: "Shelter of the Faithful", desc: "Free healing at temples.", type: "feature", crossreferences: { to: [] } },
  ],
};

describe("a background draft", () => {
  it("starts empty", () => {
    expect(blankBackgroundDraft()).toEqual({ name: "", desc: "", benefits: [] });
  });

  it("starts from a background, keeping what the form doesn't show", () => {
    const draft = draftFromBackground(acolyte);

    expect(draft.name).toBe("Acolyte");
    expect(draft.benefits.map((one) => [one.name, one.type])).toEqual([
      ["Skill Proficiencies", "skill_proficiency"],
      ["Shelter of the Faithful", "feature"],
    ]);
    expect(backgroundFromDraft(draft).benefits[0].crossreferences).toEqual({ to: [] });
  });

  it("gives each benefit an id of its own", () => {
    expect(newBenefit().id).not.toBe(newBenefit().id);
  });

  it("becomes a body with trimmed text, and no description when it's empty", () => {
    const draft = { name: "  Sailor ", desc: "  ", benefits: [{ ...newBenefit({ type: "language" }), name: " Languages ", desc: " One of your choice " }] };

    expect(backgroundFromDraft(draft)).toEqual({
      name: "Sailor",
      desc: null,
      benefits: [{ name: "Languages", desc: "One of your choice", type: "language", crossreferences: { to: [] } }],
    });
  });

  it("says what is wrong with it", () => {
    expect(backgroundProblems(blankBackgroundDraft())).toEqual(["Give the background a name."]);
    expect(backgroundProblems({ name: "X", desc: "", benefits: [newBenefit(), { ...newBenefit(), name: "A", desc: "b" }] })).toEqual([
      "Benefit 1 needs a name and a description.",
    ]);
    expect(backgroundProblems({ name: "X", desc: "", benefits: [] })).toEqual([]);
  });
});

describe("benefitTypeLabel", () => {
  it("names the kinds of benefit", () => {
    expect(benefitTypeLabel("skill_proficiency")).toBe("Skill proficiencies");
    expect(benefitTypeLabel("ability_score")).toBe("Ability scores");
  });

  it("spells out a kind it doesn't know, and says nothing for none", () => {
    expect(benefitTypeLabel("starting_gold")).toBe("Starting gold");
    expect(benefitTypeLabel(null)).toBe("");
  });
});
