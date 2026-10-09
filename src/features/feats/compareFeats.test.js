import { describe, expect, it } from "vitest";
import { compareFeats, sameContent } from "./compareFeats";

const alert = { name: "Alert", type: "Origin", prerequisite: null, desc: "", benefits: [{ desc: "Add proficiency to initiative." }] };
const grappler = { name: "Grappler", type: "GENERAL", prerequisite: " Strength 13 ", desc: "", benefits: [{ desc: "Advantage on grapples." }] };

describe("compareFeats", () => {
  it("lines up type and prerequisite, with 'None' for no prerequisite and a type in capitals written like the others", () => {
    const [overview] = compareFeats(alert, grappler);

    expect(overview.rows.map((row) => [row.label, ...row.values])).toEqual([
      ["Type", "Origin feat", "General feat"],
      ["Prerequisite", "None", "Strength 13"],
    ]);
    expect(overview.rows.every((row) => row.differs)).toBe(true);
  });

  it("marks what is the same", () => {
    const [overview] = compareFeats(alert, { ...alert, name: "Alert 2014" });

    expect(overview.rows.some((row) => row.differs)).toBe(false);
  });
});

describe("sameContent", () => {
  it("is true for feats that say the same, whatever they are called or however the text is spaced", () => {
    expect(sameContent(alert, { ...alert, name: "Other", benefits: [{ desc: " Add proficiency to initiative. " }] })).toBe(true);
  });

  it("is false when a description or a benefit differs", () => {
    expect(sameContent(alert, grappler)).toBe(false);
    expect(sameContent(alert, { ...alert, desc: "More." })).toBe(false);
    expect(sameContent(alert, { ...alert, benefits: [...alert.benefits, { desc: "Extra." }] })).toBe(false);
  });
});
