// Numbers the sheet works out for itself, which nobody types: armor class, initiative and the unarmed strike.

import { adjustmentBonus } from "./sheetAdjust";
import { abilityModifier, proficiencyBonus, signed } from "./sheetModel";

/** Armor class with nothing worn, and what a shield with no armor class of its own adds. */
export const UNARMORED = 10;
const SHIELD = 2;

const isShield = (item) => item?.category?.key === "shield";

/** The armor class of one piece of body armor for a Dex modifier: its base, plus Dex up to its cap if it takes any. */
function bodyArmorClass(armor, dex) {
  return armor.acBase + (armor.acAddDexmod ? Math.min(dex, armor.acCapDexmod ?? Infinity) : 0);
}

/**
 * Armor class from the abilities, what is equipped and the sheet's adjustment of it ("ac").
 *
 * With body armor, the best of what is worn: its base plus Dex as far as it allows. With none, 10 + Dex, or for a
 * Barbarian 10 + Dex + Con and for a Monk 10 + Dex + Wis (not with a shield). A shield adds its bonus, 2 if it has none
 * written, and only one counts. Magic bonuses to armor are not in the item data: they go in Adjustments.
 *
 * @param {object} sheet the character's `sheet`
 * @param {string[]} classNames the names of the character's classes
 * @param {object[]} equipped the Open5e items equipped (those that are armor have `armor`, a shield's category is "shield")
 */
export function armorClassOf(sheet, classNames, equipped) {
  const dex = abilityModifier(sheet, "dex");
  const worn = equipped.filter((item) => item?.armor && item.armor.acBase != null);
  const shields = worn.filter(isShield);
  const bodies = worn.filter((item) => !isShield(item));
  const shield = shields.length ? Math.max(...shields.map((item) => item.armor.acBase || SHIELD)) : 0;

  let base;
  if (bodies.length) {
    base = Math.max(...bodies.map((item) => bodyArmorClass(item.armor, dex)));
  } else {
    const names = classNames.map((name) => String(name ?? "").toLowerCase());
    const options = [UNARMORED + dex];
    if (names.some((name) => name.includes("barbarian"))) {
      options.push(UNARMORED + dex + abilityModifier(sheet, "con"));
    }
    if (!shield && names.some((name) => name.includes("monk"))) {
      options.push(UNARMORED + dex + abilityModifier(sheet, "wis"));
    }
    base = Math.max(...options);
  }
  return base + shield + adjustmentBonus(sheet, "ac");
}

/** Initiative: the Dex modifier and the sheet's adjustment of it ("initiative"). */
export function initiativeOf(sheet) {
  return abilityModifier(sheet, "dex") + adjustmentBonus(sheet, "initiative");
}

/**
 * The unarmed strike every character can make, as a row of the attacks: proficient with it, Strength to hit, and 1 + Strength
 * modifier bludgeoning damage (never less than none). The 2024 rules let a hit grapple or shove instead, against a Dex or Str
 * save of 8 + Strength modifier + proficiency bonus.
 *
 * @param {object} sheet the character's `sheet`
 * @param {number} level the character's level
 * @param {string} [ruleset] the character's rule set key, such as "5e-2024"
 * @returns {{name: string, bonus: string, damage: string, notes: string}}
 */
export function unarmedStrike(sheet, level, ruleset) {
  const strength = abilityModifier(sheet, "str") ?? 0;
  const proficiency = proficiencyBonus(level);
  const grapple = ruleset === "5e-2024" ? ` Instead of damage: grapple or shove, Str or Dex save DC ${8 + strength + proficiency}.` : "";
  return {
    name: "Unarmed Strike",
    bonus: signed(strength + proficiency),
    damage: `${Math.max(0, 1 + strength)} bludgeoning`,
    notes: `Melee, 5 ft.${grapple}`,
  };
}
