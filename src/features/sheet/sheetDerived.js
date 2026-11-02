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

const RANGE = /(\d+)\s*\/\s*(\d+)/;

/** The word stems of a text, so that "shortswords" and "Shortsword" are the same. */
const stems = (text) => String(text).toLowerCase().split(/[^a-z]+/).filter(Boolean).map((word) => word.replace(/s$/, ""));

/**
 * What a class says about the weapons it trains, as text ("Simple weapons, shortswords"), or null: the 2014 classes list them
 * under "Proficiencies" as `**Weapons:** ...`, and the 2024 ones in the table of core traits as `|Weapon Proficiencies|...|`.
 *
 * @param {?object} cls a class as the backend gives it
 * @returns {?string}
 */
export function classWeaponTraining(cls) {
  for (const feature of cls?.features ?? []) {
    const old = /\*\*Weapons:\*\*\s*([^\r\n]+)/.exec(feature.desc ?? "");
    const core = /\|\s*Weapon Proficiencies\s*\|([^|\r\n]+)\|/.exec(feature.desc ?? "");
    const found = (old ?? core)?.[1]?.trim();
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Whether the trainings (lines of text, as a class or the sheet lists them) cover a weapon: its group ("Simple weapons",
 * "martial weapons", also with the restriction some 2024 classes have, "that have the Finesse or Light property") or the
 * weapon itself by name, in the singular or plural.
 */
function trainedIn(trainings, weapon, name, propertyNames) {
  const have = new Set(propertyNames);
  const wanted = stems(weapon.name ?? name);
  return trainings.some((line) => {
    const text = String(line).toLowerCase();
    const limit = /martial weapons that have the (\w+) or (\w+) property/.exec(text);
    const martial = /martial/.test(text) && (!limit || have.has(limit[1]) || have.has(limit[2]));
    if ((weapon.isSimple && /simple/.test(text)) || (weapon.isMartial && martial)) {
      return true;
    }
    const words = new Set(stems(text));
    return wanted.length > 0 && wanted.every((word) => words.has(word));
  });
}

/**
 * The attacks of the weapons a character has equipped, one row for each as `{name, bonus, damage, notes}`: Strength to hit and
 * damage, Dexterity for a weapon with ammunition, the better of the two for a finesse weapon; the proficiency bonus when
 * trained in it, by the training the sheet lists for weapons and the class's (`classTraining`); and the +1, +2 or +3 of a magic
 * weapon (read from its name) on both. With no training known at all, any weapon but an improvised one is taken to be trained
 * in. The notes give its reach or range, its other properties and its mastery, and say when the character isn't trained in it.
 *
 * @param {object} sheet the character's `sheet`
 * @param {number} level the character's level
 * @param {object[]} items the items (or magic items) equipped; those that are not weapons are left out
 * @param {string[]} [classTraining] what the character's class says about weapon training (see `classWeaponTraining`)
 */
export function weaponAttacks(sheet, level, items, classTraining = []) {
  const trainings = [...(sheet.training?.weapons ?? []), ...classTraining];
  const strength = abilityModifier(sheet, "str") ?? 0;
  const dexterity = abilityModifier(sheet, "dex") ?? 0;
  return items
    .filter((item) => item?.weapon)
    .map((item) => {
      const { weapon } = item;
      const properties = (weapon.properties ?? []).map(({ property, detail }) => ({ name: property?.name ?? "", detail, mastery: property?.type === "Mastery" }));
      const find = (name) => properties.find((one) => one.name.toLowerCase() === name);
      const ammunition = find("ammunition");
      const modifier = ammunition ? dexterity : find("finesse") ? Math.max(strength, dexterity) : strength;
      const magic = Number(/\+(\d)/.exec(item.name ?? "")?.[1] ?? 0);
      const bonus = modifier + magic;
      const dice = weapon.damageDice ?? "";
      const damageType = weapon.damageType?.name?.toLowerCase();
      const damage = /^\d+$/.test(dice) ? String(Math.max(0, Number(dice) + bonus)) : `${dice}${bonus ? signed(bonus) : ""}`;
      const thrown = find("thrown");
      const reach = find("reach");
      const range = (ammunition ?? thrown)?.detail?.match(RANGE);
      const how = ammunition ? `Ranged ${range ? `${range[1]}/${range[2]} ft.` : ""}` : `Melee, ${reach ? 10 : 5} ft.`;
      const others = properties
        .filter((one) => !one.mastery && !["ammunition", "thrown", "reach"].includes(one.name.toLowerCase()))
        .map((one) => (one.detail ? `${one.name} (${one.detail})` : one.name));
      const thrownText = thrown ? `Thrown ${range ? `${range[1]}/${range[2]} ft.` : ""}` : null;
      const mastery = properties.filter((one) => one.mastery).map((one) => `Mastery: ${one.name}`);
      const trained = trainings.length ? trainedIn(trainings, weapon, item.name ?? "", properties.map((one) => one.name.toLowerCase())) : !weapon.isImprovised;
      return {
        name: item.name,
        bonus: signed(modifier + magic + (trained ? proficiencyBonus(level) : 0)),
        damage: [damage, damageType].filter(Boolean).join(" "),
        notes: [how.trim(), thrownText?.trim(), ...others, ...mastery, trained ? null : "Not proficient"].filter(Boolean).join(" · "),
      };
    });
}

