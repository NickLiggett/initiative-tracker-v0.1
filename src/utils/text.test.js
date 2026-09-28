import { describe, expect, it } from "vitest";
import { capitalizeFirstLetter, capitalizeWords, labelFromCamelCase } from "./text";

describe("text", () => {
  it("capitalizes words, leaving small joining words lowercase", () => {
    expect(capitalizeWords("chaotic evil")).toBe("Chaotic Evil");
    expect(capitalizeWords("bludgeoning and piercing from nonmagical attacks")).toBe(
      "Bludgeoning and Piercing from Nonmagical Attacks",
    );
    expect(capitalizeWords("")).toBe("");
    expect(capitalizeWords(undefined)).toBeUndefined();
  });

  it("capitalizes the first letter", () => {
    expect(capitalizeFirstLetter("fire")).toBe("Fire");
    expect(capitalizeFirstLetter(null)).toBeNull();
  });

  it("turns camelCase keys into labels", () => {
    expect(labelFromCamelCase("sleightOfHand")).toBe("Sleight of Hand");
    expect(labelFromCamelCase("perception")).toBe("Perception");
  });
});
