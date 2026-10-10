import { describe, expect, it } from "vitest";
import { EMPTY_COMBATANT } from "./CombatantForm";
import { applyChange, creatureFields } from "./creaturePrefill";

const goblin = { key: "goblin", name: "Goblin", armorClass: 15, hitPoints: 7, initiativeBonus: 2 };
const ogre = { key: "ogre", name: "Ogre", armorClass: 11, hitPoints: 59, initiativeBonus: -1 };
const half = () => 0.5; // a d20 of 11

describe("creatureFields", () => {
  it("gives the name, a d20 plus the bonus, the armor class and the hit points", () => {
    expect(creatureFields(goblin, half)).toEqual({ name: "Goblin", initiative: "13", armorClass: "15", hitPoints: "7" });
  });

  it("keeps each within what its field holds", () => {
    const fields = creatureFields({ name: "The Ancient Dragon of Many Long Names", armorClass: 120, hitPoints: 30000, initiativeBonus: -30 }, half);
    expect(fields).toEqual({ name: "The Ancient Dragon of Man", initiative: "0", armorClass: "99", hitPoints: "9999" });
  });

  it("leaves out what the creature doesn't have", () => {
    expect(creatureFields({ name: "Blob" }, half)).toMatchObject({ armorClass: "", hitPoints: "" });
  });
});

describe("applyChange", () => {
  it("fills the empty fields when a creature is chosen", () => {
    const form = applyChange(EMPTY_COMBATANT, { type: "Creature", creature: goblin }, half);
    expect(form).toMatchObject({ name: "Goblin", initiative: "13", armorClass: "15", hitPoints: "7", creature: goblin });
  });

  it("keeps what the user typed", () => {
    let form = applyChange(EMPTY_COMBATANT, { name: "Sneaky", armorClass: "18" }, half);
    form = applyChange(form, { creature: goblin }, half);
    expect(form).toMatchObject({ name: "Sneaky", armorClass: "18", hitPoints: "7", initiative: "13" });
  });

  it("changes what it filled in when another creature is chosen, but not what was typed over it", () => {
    let form = applyChange(EMPTY_COMBATANT, { creature: goblin }, half);
    form = applyChange(form, { hitPoints: "30" }, half);
    form = applyChange(form, { creature: ogre }, half);
    expect(form).toMatchObject({ name: "Ogre", armorClass: "11", hitPoints: "30", creature: ogre });
  });

  it("empties what it filled in when the creature is cleared, and keeps what was typed", () => {
    let form = applyChange(EMPTY_COMBATANT, { initiative: "20" }, half);
    form = applyChange(form, { creature: goblin }, half);
    form = applyChange(form, { creature: null }, half);
    expect(form).toMatchObject({ name: "", armorClass: "", hitPoints: "", initiative: "20", creature: null });
  });
});
