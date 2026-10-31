import { describe, expect, it } from "vitest";
import {
  hitDiceRegained,
  newSpellRow,
  regainHitDice,
  spellAttackBonus,
  spellDrafts,
  spellProblems,
  spellRowFor,
  spellSaveDc,
  spellsToSheet,
  spendHitDie,
  spendPact,
  spendSlot,
  togglePrepared,
  resourceDraft,
  resourceProblems,
  withResources,
  withSpell,
  withSpellcastingAbility,
  withoutSpell,
} from "./sheetCasting";
import { restWouldHelp, takeRest } from "./sheetRests";
import { toSheet, toSheetDraft } from "./sheetModel";

// Dante: level 14, Wisdom 16 (+3), proficiency +5, so spell save DC 16 and spell attack +8, as on his sheet.
const dante = {
  abilities: { wis: 16 },
  spellcasting: { ability: "wis" },
  slots: { 1: { max: 4, used: 1 }, 2: { max: 3, used: 3 } },
  pact: { max: 2, used: 1, level: 2 },
  hitDice: [
    { die: "d10", max: 13, used: 4 },
    { die: "d8", max: 1, used: 1 },
  ],
  features: [{ name: "Blood Maledict", uses: { max: 2, used: 2, per: "short" } }, { name: "Revealed Arcana", uses: { max: 1, used: 1, per: "long" } }],
  spells: [
    { name: "Misty Step", key: "srd_misty-step", level: 2, school: "Conjuration", castingTime: "1 bonus action", prepared: true },
    { name: "Light", level: 0 },
  ],
};

describe("the spellcasting numbers", () => {
  it("are 8 + proficiency + the modifier for the save DC, and without the 8 for the attack", () => {
    expect(spellSaveDc(dante, 14)).toBe(16);
    expect(spellAttackBonus(dante, 14)).toBe(8);
  });

  it("are nothing without an ability chosen or its score", () => {
    expect(spellSaveDc({ abilities: { wis: 16 } }, 14)).toBeNull();
    expect(spellSaveDc({ spellcasting: { ability: "wis" } }, 14)).toBeNull();
    expect(spellAttackBonus({}, 14)).toBeNull();
  });
});

describe("the spell part of the editor", () => {
  it("comes back as the sheet it started from", () => {
    expect(toSheet(toSheetDraft(dante), dante)).toEqual(dante);
  });

  it("sends nothing for a sheet with none of it", () => {
    expect(spellsToSheet(spellDrafts({}))).toEqual({});
  });

  it("never keeps more spent than there are, and drops slot levels with none", () => {
    const draft = spellDrafts({});
    draft.slots[1] = { max: "2", used: "9" };
    draft.slots[2] = { max: "0", used: "0" };

    expect(spellsToSheet(draft).slots).toEqual({ 1: { max: 2, used: 2 } });
  });

  it("takes a spell from the lists with what it says about itself, and one typed by hand as written", () => {
    const row = spellRowFor({ key: "srd_fireball", name: "Fireball", level: 3, school: { name: "Evocation" }, castingTime: "action", range: 150, rangeUnit: "ft", duration: "instantaneous", document: { displayName: "SRD" } });

    expect(row).toMatchObject({ name: "Fireball", key: "srd_fireball", level: "3", school: "Evocation", castingTime: "1 action", range: "150 feet", duration: "Instantaneous", source: "SRD", prepared: false });
    expect(newSpellRow("Homebrew Hex")).toMatchObject({ name: "Homebrew Hex", key: "", level: "1" });
  });

  it("refuses slots, pact slots, hit dice and spells that can't be", () => {
    const draft = spellDrafts({});
    draft.slots[1].max = "50";
    draft.pact = { max: "2", level: "", used: "0" };
    draft.hitDice = [{ die: "d10", max: "3", used: "0" }, { die: "d10", max: "2", used: "0" }];
    draft.spells = [{ ...newSpellRow("X"), level: "12" }, { ...newSpellRow(""), notes: "something" }];

    expect(spellProblems(draft)).toEqual([
      "Spell slots must be 0 to 20 of each level, or left empty.",
      "Say the level of the pact slots, 1 to 9.",
      "Each size of hit die is listed once; add its dice together.",
      "Give each spell a name, or remove it.",
      "A spell's level is 0 (a cantrip) to 9.",
    ]);
  });
});

describe("spending", () => {
  it("spends and gives back slots, pact slots and hit dice within what there is", () => {
    expect(spendSlot(dante, 1, 1).slots[1].used).toBe(2);
    expect(spendSlot(dante, 2, 1).slots[2].used).toBe(3); // none left
    expect(spendSlot(dante, 2, -1).slots[2].used).toBe(2);
    expect(spendSlot(dante, 9, 1)).toEqual(dante); // no such slots
    expect(spendPact(dante, 1).pact.used).toBe(2);
    expect(spendPact(spendPact(dante, 1), 1).pact.used).toBe(2);
    expect(spendHitDie(dante, 0, 1).hitDice[0].used).toBe(5);
    expect(spendHitDie(dante, 1, 1).hitDice[1].used).toBe(1);
  });

  it("turns a spell's prepared mark over", () => {
    expect(togglePrepared(dante, 0).spells[0].prepared).toBe(false);
    expect(togglePrepared(dante, 1).spells[1].prepared).toBe(true);
  });
});

describe("hit dice on a long rest", () => {
  it("give back half of all the character has, at least one", () => {
    expect(hitDiceRegained(dante)).toBe(7); // 14 dice
    expect(hitDiceRegained({ hitDice: [{ die: "d8", max: 1, used: 1 }] })).toBe(1);
    expect(hitDiceRegained({})).toBe(0);
  });

  it("give back the biggest dice first", () => {
    const sheet = { hitDice: [{ die: "d8", max: 2, used: 2 }, { die: "d12", max: 4, used: 3 }] }; // 6 dice, 3 back

    expect(regainHitDice(sheet).hitDice).toEqual([{ die: "d8", max: 2, used: 2 }, { die: "d12", max: 4, used: 0 }]);
    expect(regainHitDice({ hitDice: [{ die: "d8", max: 2, used: 2 }, { die: "d12", max: 2, used: 1 }] }).hitDice).toEqual([
      { die: "d8", max: 2, used: 1 }, // 2 dice back: the d12 first, then one d8
      { die: "d12", max: 2, used: 0 },
    ]);
  });
});

describe("resting", () => {
  it("a short rest gives back the features that come back on one and the pact slots, nothing else", () => {
    const rested = takeRest(dante, "short");

    expect(rested.features.map((feature) => feature.uses.used)).toEqual([0, 1]);
    expect(rested.pact.used).toBe(0);
    expect(rested.slots).toEqual(dante.slots);
    expect(rested.hitDice).toEqual(dante.hitDice);
  });

  it("a long rest gives back every use and slot, and half the hit dice", () => {
    const rested = takeRest(dante, "long");

    expect(rested.features.map((feature) => feature.uses.used)).toEqual([0, 0]);
    expect(rested.pact.used).toBe(0);
    expect(rested.slots[1].used + rested.slots[2].used).toBe(0);
    expect(rested.hitDice).toEqual([{ die: "d10", max: 13, used: 0 }, { die: "d8", max: 1, used: 0 }]); // 7 dice may come back and only 5 were spent
  });

  it("only offers a rest that would give something back", () => {
    const fresh = takeRest(takeRest(dante, "long"), "long");

    expect(restWouldHelp(dante, "short")).toBe(true);
    expect(restWouldHelp({ ...fresh, hitDice: [], features: [], pact: undefined, slots: {} }, "long")).toBe(false);
    expect(restWouldHelp({ slots: { 1: { max: 2, used: 1 } } }, "short")).toBe(false);
    expect(restWouldHelp({ slots: { 1: { max: 2, used: 1 } } }, "long")).toBe(true);
  });
});

describe("changing one part in place", () => {
  const sheet = { abilities: { wis: 16 }, spellcasting: { ability: "wis" }, slots: { 1: { max: 2, used: 1 } }, hitDice: [{ die: "d10", max: 4, used: 2 }], spells: [{ name: "Light", level: 0 }] };

  it("sets and clears the casting ability", () => {
    expect(withSpellcastingAbility(sheet, "int").spellcasting).toEqual({ ability: "int" });
    expect(withSpellcastingAbility(sheet, "").spellcasting).toBeUndefined();
    expect(withSpellcastingAbility(sheet, "str").spellcasting).toBeUndefined(); // not one that casts
  });

  it("adds, changes and removes a spell", () => {
    const row = { ...newSpellRow(" Fire Bolt "), level: "0", notes: "x" };
    const added = withSpell(sheet, null, row);
    expect(added.spells).toEqual([{ name: "Light", level: 0 }, { name: "Fire Bolt", level: 0, notes: "x" }]);
    expect(withSpell(added, 0, { ...newSpellRow("Light"), level: "0", prepared: true }).spells[0]).toEqual({ name: "Light", level: 0, prepared: true });
    expect(withoutSpell(added, 0).spells).toEqual([{ name: "Fire Bolt", level: 0, notes: "x" }]);
    expect(withoutSpell(sheet, 0).spells).toBeUndefined();
  });

  it("changes the totals keeping what is spent, and drops what is emptied", () => {
    const draft = resourceDraft(sheet);
    draft.slots[1].max = "1"; // fewer than spent... one of two spent stays at most one
    draft.slots[3].max = "2";
    draft.hitDice = [];
    const changed = withResources(sheet, draft);
    expect(changed.slots).toEqual({ 1: { max: 1, used: 1 }, 3: { max: 2, used: 0 } });
    expect(changed.hitDice).toBeUndefined();
    expect(changed.spells).toEqual(sheet.spells);
    expect(changed.abilities).toEqual({ wis: 16 });
  });

  it("says what stops the totals from being saved", () => {
    const draft = resourceDraft(sheet);
    draft.slots[1].max = "40";
    expect(resourceProblems(draft)).toEqual(["Spell slots must be 0 to 20 of each level, or left empty."]);
  });
});

