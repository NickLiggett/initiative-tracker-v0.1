import { describe, expect, it } from "vitest";
import { describeResult, traitBody } from "./speciesFormat";

describe("traitBody", () => {
  it("drops the name Open5e's text starts with, since the name is shown on its own line", () => {
    const trait = { name: "Darkvision", desc: "**_Darkvision._** You can see in dim light within 60 feet." };

    expect(traitBody(trait)).toBe("You can see in dim light within 60 feet.");
  });

  it("copes with the variations of how that name is written", () => {
    expect(traitBody({ name: "Age", desc: "**_Age._** Mature like humans." })).toBe("Mature like humans.");
    expect(traitBody({ name: "Age", desc: "**Age.** Mature like humans." })).toBe("Mature like humans.");
    expect(traitBody({ name: "Age", desc: "**_Age_** Mature like humans." })).toBe("Mature like humans.");
    expect(traitBody({ name: "age", desc: "**_Age._**  Mature like humans." })).toBe("Mature like humans.");
  });

  it("keeps the text when it starts with something else in bold", () => {
    const trait = { name: "Healing Hands", desc: "**_Healing_** is not the name. **bold** later." };

    expect(traitBody(trait)).toBe(trait.desc);
  });

  it("leaves text without that prefix as it is, as a homebrew trait has", () => {
    expect(traitBody({ name: "Keen Nose", desc: "You smell things." })).toBe("You smell things.");
  });

  it("is empty for a trait without text", () => {
    expect(traitBody({ name: "x" })).toBe("");
    expect(traitBody({ name: "x", desc: null })).toBe("");
  });
});

describe("describeResult", () => {
  it("says what it is and where it's from", () => {
    expect(describeResult({ isSubspecies: true, document: { displayName: "5e 2014 Rules" } })).toBe("Subspecies · 5e 2014 Rules");
    expect(describeResult({ isSubspecies: false, document: { displayName: "5e 2014 Rules" } })).toBe("5e 2014 Rules");
    expect(describeResult({ isSubspecies: false, document: { name: "My Book" } })).toBe("My Book");
    expect(describeResult({})).toBe("");
  });
});
