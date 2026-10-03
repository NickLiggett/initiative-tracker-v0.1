import { describe, expect, it } from "vitest";
import red from "../../test/fixtures/adult-red-dragon.json";
import black from "../../test/fixtures/adult-black-dragon.json";
import { compareCreatures, sharedEntryNames } from "./compareCreatures";

/** The table's rows by "Section/Label". */
const rowsByName = (first, second) =>
  Object.fromEntries(
    compareCreatures(first, second).flatMap((section) => section.rows.map((row) => [`${section.title}/${row.label}`, row])),
  );

describe("compareCreatures", () => {
  const table = rowsByName(red, black);

  it("compares numbers, with the difference and which is higher", () => {
    expect(table["Overview/Hit Points"]).toMatchObject({ values: ["256", "253"], delta: -3, higher: 0, differs: true });
    expect(table["Overview/Armor Class"]).toMatchObject({ values: ["19", "19"], delta: 0, higher: null, differs: false });
    expect(table["Overview/Experience"].values).toEqual(["18,000 XP", "18,000 XP"]);
  });

  it("shows ability scores with their modifiers", () => {
    expect(table["Ability scores/Strength"]).toMatchObject({ values: ["27 (+8)", "22 (+6)"], delta: -5, higher: 0 });
  });

  it("compares every save, proficient or not, and the skills either one is proficient in", () => {
    expect(table["Saving throws/Strength"].values).toEqual(["+8", "+6"]);
    expect(table["Skills/Perception"].values).toEqual(["+13", "+7"]);
    expect(table["Skills/Stealth"].values).toEqual(["+6", "+8"]);
    expect(table["Skills/Arcana"]).toBeUndefined(); // neither is proficient
  });

  it("works out the proficiency bonus when the backend has none", () => {
    expect(table["Overview/Proficiency Bonus"].values).toEqual(["+6", "+6"]);
  });

  it("compares text such as speed and immunities, flagging only real differences", () => {
    expect(table["Overview/Speed"].differs).toBe(true);
    expect(table["Senses and defenses/Damage Immunities"]).toMatchObject({ values: ["Fire", "Acid"], differs: true });
    expect(table["Senses and defenses/Languages"].values[1]).toBe("Common, Draconic");
    expect(table["Senses and defenses/Languages"].delta).toBeNull();
  });

  it("leaves out rows neither creature has anything for", () => {
    expect(table["Senses and defenses/Damage Vulnerabilities"]).toBeUndefined();
  });
});

describe("sharedEntryNames", () => {
  it("finds traits and actions both creatures have, ignoring case", () => {
    const shared = sharedEntryNames(red, black);
    expect(shared.has("legendary resistance (3/day)")).toBe(true);
    expect(shared.has("multiattack")).toBe(true);
    expect(shared.has("fire breath")).toBe(false);
  });
});
