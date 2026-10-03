import { describe, expect, it } from "vitest";
import red from "../../test/fixtures/adult-red-dragon.json";
import black from "../../test/fixtures/adult-black-dragon.json";
import { blankDraft, creatureFromDraft, draftFromCreature, draftProblems } from "./creatureDraft";

describe("a new creature", () => {
  it("needs a name", () => {
    expect(draftProblems(blankDraft())).toHaveLength(1);
    expect(draftProblems({ ...blankDraft(), name: " Gribble " })).toEqual([]);
  });

  it("carries the numbers the backend stores but doesn't work out", () => {
    const draft = {
      ...blankDraft(),
      name: " Gribble ",
      challengeRating: 5,
      armorClass: "15",
      hitPoints: "90",
      hitDice: "12d8+36",
      abilityScores: { strength: "18", dexterity: "14", constitution: "16", intelligence: "8", wisdom: "12", charisma: "6" },
      skillLevels: { perception: 1, stealth: 2 },
      saveLevels: { strength: 1 },
      speed: { walk: "30", fly: "60", swim: "", climb: "", burrow: "", crawl: "", hover: true },
      languages: " Common ",
    };

    expect(creatureFromDraft(draft)).toMatchObject({
      name: "Gribble",
      category: "Monsters",
      challengeRating: 5,
      proficiencyBonus: 3,
      experiencePoints: 1800,
      armorClass: 15,
      hitPoints: 90,
      hitDice: "12d8+36",
      abilityScores: { strength: 18, dexterity: 14, charisma: 6 },
      modifiers: { strength: 4, dexterity: 2, constitution: 3, intelligence: -1, wisdom: 1, charisma: -2 },
      initiativeBonus: 2,
      savingThrows: { strength: 7 }, // only the proficient ones
      savingThrowsAll: { strength: 7, dexterity: 2, charisma: -2 },
      skillBonuses: { perception: 4, stealth: 8 }, // proficiency, then expertise
      skillBonusesAll: { perception: 4, stealth: 8, athletics: 4, arcana: -1 },
      passivePerception: 14,
      speed: { unit: "feet", walk: 30, fly: 60 },
      speedAll: { unit: "feet", walk: 30, fly: 60, swim: 15, climb: 15, burrow: 0, crawl: 15, hover: true }, // half the walk
      languages: { asString: "Common", data: [] },
    });
  });

  it("leaves a blank number empty, and a blank ability score at 10", () => {
    const draft = { ...blankDraft(), armorClass: "", hitPoints: "", abilityScores: { ...blankDraft().abilityScores, wisdom: "" } };
    expect(creatureFromDraft(draft)).toMatchObject({ armorClass: null, hitPoints: null, modifiers: { wisdom: 0 } });
  });
});

describe("a draft from an existing creature", () => {
  it.each([
    ["red", red],
    ["black", black],
  ])("saves the %s dragon back with the same numbers", (name, dragon) => {
    const saved = creatureFromDraft(draftFromCreature(dragon));

    for (const field of [
      "abilityScores",
      "modifiers",
      "initiativeBonus",
      "savingThrows",
      "savingThrowsAll",
      "skillBonuses",
      "skillBonusesAll",
      "passivePerception",
      "armorClass",
      "hitPoints",
      "hitDice",
      "experiencePoints",
      "speed",
      "speedAll",
    ]) {
      expect(saved[field], field).toEqual(dragon[field]);
    }
    expect(saved.languages.data).toEqual(dragon.languages.data);
  });

  it("keeps what the form doesn't show", () => {
    const saved = creatureFromDraft(draftFromCreature(black));
    expect(saved.actions).toEqual(black.actions);
    expect(saved.traits).toEqual(black.traits);
    expect(saved.resistancesAndImmunities).toEqual(black.resistancesAndImmunities);
  });

  it("recalculates when an ability score changes", () => {
    const draft = draftFromCreature(black);
    draft.abilityScores.dexterity = "20"; // +5; the black dragon is proficient in Dexterity saves and Stealth

    expect(creatureFromDraft(draft)).toMatchObject({
      modifiers: { dexterity: 5 },
      initiativeBonus: 5,
      savingThrows: { dexterity: 11 },
      skillBonuses: { stealth: 11 },
    });
  });

  it("works out proficiency and experience from a new challenge rating", () => {
    const draft = draftFromCreature(black);
    draft.challengeRating = 20;

    expect(creatureFromDraft(draft)).toMatchObject({ proficiencyBonus: 6, experiencePoints: 25000 });
    draft.challengeRating = 21;
    expect(creatureFromDraft(draft)).toMatchObject({ proficiencyBonus: 7, savingThrows: { dexterity: 9 } });
  });
});
