import { describe, expect, it } from "vitest";
import {
  abilityModifier,
  modifier,
  passiveScore,
  proficiencyBonus,
  saveBonus,
  sheetProblems,
  signed,
  skillBonus,
  skillLevel,
  toSheet,
  toSheetDraft,
} from "./sheetModel";

// Dante, from his sheet: level 14, Dexterity 20, proficient in Dexterity and Intelligence saves.
const dante = {
  abilities: { str: 12, dex: 20, con: 18, int: 12, wis: 16, cha: 10 },
  saves: ["dex", "int"],
  skills: { stealth: "expertise", perception: "proficient", arcana: "proficient" },
};

describe("modifier", () => {
  it("is the score minus ten, halved and rounded down", () => {
    expect([1, 8, 9, 10, 11, 12, 13, 20, 30].map(modifier)).toEqual([-5, -1, -1, 0, 0, 1, 1, 5, 10]);
  });
});

describe("proficiencyBonus", () => {
  it("rises by one every four levels", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  it("stays within levels 1 to 20", () => {
    expect([proficiencyBonus(0), proficiencyBonus(25)]).toEqual([2, 6]);
  });
});

describe("signed", () => {
  it("writes a bonus as a sheet does", () => {
    expect([signed(3), signed(0), signed(-2)]).toEqual(["+3", "+0", "-2"]);
  });
});

describe("what is worked out from the sheet", () => {
  it("is the modifier of an ability, nothing when there is no score", () => {
    expect(abilityModifier(dante, "dex")).toBe(5);
    expect(abilityModifier({}, "dex")).toBeNull();
  });

  it("adds the proficiency bonus to a saving throw the character is proficient in (+10 for Dante, as on his sheet)", () => {
    expect(saveBonus(dante, "dex", 14)).toBe(10);
    expect(saveBonus(dante, "int", 14)).toBe(6);
    expect(saveBonus(dante, "wis", 14)).toBe(3);
    expect(saveBonus({}, "dex", 14)).toBeNull();
  });

  it("adds the proficiency bonus to a skill, and twice it for expertise", () => {
    expect(skillLevel(dante, "stealth")).toBe("expertise");
    expect(skillLevel(dante, "athletics")).toBe("none");
    expect(skillBonus(dante, "stealth", 14)).toBe(15); // 5 + 2 * 5
    expect(skillBonus(dante, "perception", 14)).toBe(8); // 3 + 5
    expect(skillBonus(dante, "athletics", 14)).toBe(1);
  });

  it("makes the passive scores ten more than the skill", () => {
    expect(passiveScore(dante, "perception", 14)).toBe(18);
    expect(passiveScore(dante, "insight", 14)).toBe(13);
    expect(passiveScore({}, "perception", 14)).toBeNull();
  });
});

describe("the draft of a sheet", () => {
  it("is empty for a sheet that has nothing, and sends nothing for it", () => {
    const draft = toSheetDraft({});

    expect(draft.abilities.str).toBe("");
    expect(draft.skills.stealth).toBe("none");
    expect(sheetProblems(draft)).toEqual([]);
    expect(toSheet(draft)).toEqual({});
  });

  it("comes back as the sheet it started from", () => {
    const sheet = {
      ...dante,
      speed: { walk: 35, other: "fly 30 ft." },
      senses: ["Darkvision 120 ft."],
      defenses: { resistances: ["necrotic", "radiant"] },
      training: { languages: ["Common", "Celestial"] },
      personal: { alignment: "Chaotic Good", backstory: "Long ago..." },
    };

    expect(toSheet(toSheetDraft(sheet), sheet)).toEqual(sheet);
  });

  it("keeps whatever else is on the sheet that the form does not show", () => {
    const sheet = { abilities: { str: 10 }, attacks: [{ name: "Longsword" }] };
    const draft = toSheetDraft(sheet);
    draft.abilities.str = "14";

    expect(toSheet(draft, sheet)).toEqual({ abilities: { str: 14 }, attacks: [{ name: "Longsword" }] });
  });

  it("takes a list a line at a time and drops the blank lines", () => {
    const draft = toSheetDraft({});
    draft.senses = "Darkvision 60 ft.\n\n  Tremorsense 10 ft.  \n";

    expect(toSheet(draft).senses).toEqual(["Darkvision 60 ft.", "Tremorsense 10 ft."]);
  });

  it("refuses scores that are not 1 to 30, and speeds that are not numbers", () => {
    const draft = toSheetDraft({});
    draft.abilities.str = "31";
    draft.abilities.dex = "lots";
    draft.speed.walk = "fast";

    expect(sheetProblems(draft)).toEqual([
      "Strength must be 1 to 30, or left empty.",
      "Dexterity must be 1 to 30, or left empty.",
      "Walking speed must be 0 to 999 feet, or left empty.",
    ]);
  });
});
