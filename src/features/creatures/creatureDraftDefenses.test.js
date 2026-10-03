import { describe, expect, it } from "vitest";
import black from "../../test/fixtures/adult-black-dragon.json";
import { blankDraft, creatureFromDraft, draftFromCreature, withDefenseItems } from "./creatureDraft";

const fire = { key: "fire", name: "Fire" };
const cold = { key: "cold", name: "Cold" };

describe("senses", () => {
  it("are saved as ranges, leaving blank ones empty", () => {
    const draft = { ...blankDraft(), name: "X" };
    draft.senses = { darkvision: "60", blindsight: "", tremorsense: "30", truesight: "" };

    expect(creatureFromDraft(draft)).toMatchObject({
      darkvisionRange: 60,
      blindsightRange: null,
      tremorsenseRange: 30,
      truesightRange: null,
      normalSightRange: 10560, // a mile, as for every creature in the backend
    });
  });
});

describe("damage and condition lists", () => {
  it("are saved with their text", () => {
    const draft = { ...blankDraft(), name: "X" };
    draft.defenses.damageImmunities = { items: [fire], display: " fire " };
    draft.defenses.conditionImmunities = { items: [{ key: "charmed", name: "Charmed" }], display: "charmed" };

    expect(creatureFromDraft(draft).resistancesAndImmunities).toEqual({
      damageVulnerabilities: [],
      damageVulnerabilitiesDisplay: "",
      damageResistances: [],
      damageResistancesDisplay: "",
      damageImmunities: [fire],
      damageImmunitiesDisplay: "fire",
      conditionImmunities: [{ key: "charmed", name: "Charmed" }],
      conditionImmunitiesDisplay: "charmed",
    });
  });

  it("follow the list with their text, until the text is written by hand", () => {
    const empty = { items: [], display: "" };
    const withFire = withDefenseItems(empty, [fire]);
    expect(withFire).toEqual({ items: [fire], display: "fire" });
    expect(withDefenseItems(withFire, [fire, cold])).toEqual({ items: [fire, cold], display: "fire, cold" });

    const handWritten = { items: [fire], display: "fire from nonmagical sources" };
    expect(withDefenseItems(handWritten, [fire, cold])).toEqual({
      items: [fire, cold],
      display: "fire from nonmagical sources",
    });
  });
});

describe("proficiency levels", () => {
  it("keep expertise through a round trip", () => {
    const draft = draftFromCreature({
      ...black,
      skillBonuses: { stealth: 14 }, // +2 Dexterity and expertise at +6 each
      skillBonusesAll: { ...black.skillBonusesAll, stealth: 14 },
    });

    expect(draft.skillLevels.stealth).toBe(2);
    expect(draft.skillLevels.perception).toBe(0);
    expect(draft.saveLevels.dexterity).toBe(1);
    expect(creatureFromDraft(draft).skillBonuses).toEqual({ stealth: 14 });
  });
});
