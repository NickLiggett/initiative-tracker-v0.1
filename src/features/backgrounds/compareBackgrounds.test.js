import { describe, expect, it } from "vitest";
import { compareBackgrounds, longBenefits } from "./compareBackgrounds";

const acolyte = {
  name: "Acolyte",
  benefits: [
    { name: "Skill Proficiencies", desc: "Insight, Religion", type: "skill_proficiency" },
    { name: "Languages", desc: "Two **of your choice**.\n", type: "language" },
    { name: "Shelter of the Faithful", desc: "Free healing at temples.", type: "feature" },
    { name: "Suggested Characteristics", desc: "Roll a d8.", type: "suggested_characteristics" },
  ],
};
const hermit = { name: "Hermit", benefits: [{ name: "Skill Proficiencies", desc: "Medicine, Religion", type: "skill_proficiency" }] };

describe("compareBackgrounds", () => {
  it("lines up each short kind of benefit, in a fixed order, one line of text each, features by name", () => {
    const [section] = compareBackgrounds(acolyte, hermit);

    expect(section.rows.map((row) => [row.label, ...row.values])).toEqual([
      ["Skill proficiencies", "Insight, Religion", "Medicine, Religion"],
      ["Languages", "Two of your choice.", "—"],
      ["Feature", "Shelter of the Faithful", "—"],
    ]);
    expect(section.rows.map((row) => row.differs)).toEqual([true, true, true]);
  });

  it("leaves out a kind that neither has, and everything when neither has any", () => {
    expect(compareBackgrounds(hermit, hermit)[0].rows.map((row) => row.label)).toEqual(["Skill proficiencies"]);
    expect(compareBackgrounds({ benefits: [] }, { name: "No list" })).toEqual([]);
  });

  it("joins several benefits of one kind", () => {
    const twoFeatures = { benefits: [{ name: "A", desc: "x", type: "feature" }, { name: "B", desc: "y", type: "feature" }] };

    expect(compareBackgrounds(twoFeatures, hermit)[0].rows.find((row) => row.label === "Feature").values[0]).toBe("A; B");
  });
});

describe("longBenefits", () => {
  it("is what the table can't say: features in full and the longer kinds, not the short ones", () => {
    expect(longBenefits(acolyte).map((benefit) => benefit.name)).toEqual(["Shelter of the Faithful", "Suggested Characteristics"]);
    expect(longBenefits({})).toEqual([]);
  });
});
