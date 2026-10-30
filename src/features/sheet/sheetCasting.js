// Spells on a character's sheet: the ability they are cast with, spell slots (and pact slots), the spells themselves, and the
// hit dice. Slot totals are typed in, not worked out from the classes, so homebrew casters fit.
//
//   spellcasting  {ability: "wis"}: the ability spell save DCs and attack bonuses use
//   slots         {"1": {max, used}, ...}: levels 1 to 9, only those the character has
//   pact          {max, used, level}: pact slots, all of one level, which come back on a short rest
//   hitDice       [{die: "d10", max, used}]: one pool for each size of die
//   spells        [{name, key, level, school, castingTime, range, duration, concentration, ritual, prepared, source, notes}]
//                 `key` is only there for a spell picked from the lists; a spell typed by hand has what was written

import { castingTimeWithCondition, durationText, rangeText } from "../spells/spellFormat";
import { adjustmentBonus } from "./sheetAdjust";
import { abilityModifier, proficiencyBonus } from "./sheetModel";

export const SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const MAX_SLOTS = 20;
export const MAX_PACT_LEVEL = 9;
export const DICE = ["d6", "d8", "d10", "d12"];
export const MAX_HIT_DICE = 20;
export const MAX_SPELLS = 300;
export const CASTING_ABILITIES = [
  { key: "int", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
];

const text = (value) => (typeof value === "string" ? value : "");
const whole = (value) => (/^\d+$/.test(String(value).trim()) ? parseInt(value, 10) : NaN);
const filled = (value) => String(value).trim() !== "";

/** 8 + the proficiency bonus + the casting ability's modifier, or null if no ability is chosen or it has no score. */
export function spellSaveDc(sheet, level) {
  const ability = sheet?.spellcasting?.ability;
  const modifier = ability ? abilityModifier(sheet, ability) : null;
  return modifier === null ? null : 8 + proficiencyBonus(level) + modifier + adjustmentBonus(sheet, "spell.dc");
}

/** The proficiency bonus plus the casting ability's modifier, or null as for the DC. */
export function spellAttackBonus(sheet, level) {
  const ability = sheet?.spellcasting?.ability;
  const modifier = ability ? abilityModifier(sheet, ability) : null;
  return modifier === null ? null : proficiencyBonus(level) + modifier + adjustmentBonus(sheet, "spell.attack");
}

// ---- the editor's drafts ----

/** The form's view of the spell part of a sheet: totals and spent counts as text, spells as rows. */
export function spellDrafts(sheet = {}) {
  return {
    spellcasting: CASTING_ABILITIES.some(({ key }) => key === sheet?.spellcasting?.ability) ? sheet.spellcasting.ability : "",
    slots: Object.fromEntries(
      SLOT_LEVELS.map((level) => [
        level,
        { max: Number.isFinite(sheet?.slots?.[level]?.max) ? String(sheet.slots[level].max) : "", used: Number.isFinite(sheet?.slots?.[level]?.used) ? String(sheet.slots[level].used) : "0" },
      ]),
    ),
    pact: {
      max: Number.isFinite(sheet?.pact?.max) ? String(sheet.pact.max) : "",
      level: Number.isFinite(sheet?.pact?.level) ? String(sheet.pact.level) : "",
      used: Number.isFinite(sheet?.pact?.used) ? String(sheet.pact.used) : "0",
    },
    hitDice: (Array.isArray(sheet?.hitDice) ? sheet.hitDice : []).map((pool) => ({
      die: DICE.includes(pool?.die) ? pool.die : "d8",
      max: Number.isFinite(pool?.max) ? String(pool.max) : "",
      used: Number.isFinite(pool?.used) ? String(pool.used) : "0",
    })),
    spells: (Array.isArray(sheet?.spells) ? sheet.spells : []).map((spell) => ({
      name: text(spell?.name),
      key: text(spell?.key),
      level: Number.isInteger(spell?.level) ? String(spell.level) : "0",
      school: text(spell?.school),
      castingTime: text(spell?.castingTime),
      range: text(spell?.range),
      duration: text(spell?.duration),
      concentration: spell?.concentration === true,
      ritual: spell?.ritual === true,
      prepared: spell?.prepared === true,
      source: text(spell?.source),
      notes: text(spell?.notes),
    })),
  };
}

/** A row of the spell list for a spell picked from Open5e's lists, with what it says about itself. */
export function spellRowFor(spell) {
  return {
    name: spell.name,
    key: spell.key,
    level: String(spell.level ?? 0),
    school: spell.school?.name ?? "",
    castingTime: castingTimeWithCondition(spell),
    range: rangeText(spell),
    duration: durationText(spell),
    concentration: Boolean(spell.concentration),
    ritual: Boolean(spell.ritual),
    prepared: false,
    source: spell.document?.displayName ?? spell.document?.name ?? "",
    notes: "",
  };
}

/** A row for a spell typed by hand. */
export const newSpellRow = (name) => ({
  name,
  key: "",
  level: "1",
  school: "",
  castingTime: "",
  range: "",
  duration: "",
  concentration: false,
  ritual: false,
  prepared: false,
  source: "",
  notes: "",
});

/** What stops these from being saved: sentences, none when they can be. */
export function spellProblems({ slots, pact, hitDice, spells }) {
  const problems = [];
  if (SLOT_LEVELS.some((level) => filled(slots[level].max) && !(whole(slots[level].max) >= 0 && whole(slots[level].max) <= MAX_SLOTS))) {
    problems.push(`Spell slots must be 0 to ${MAX_SLOTS} of each level, or left empty.`);
  }
  if (filled(pact.max) && !(whole(pact.max) >= 0 && whole(pact.max) <= MAX_SLOTS)) {
    problems.push(`Pact slots must be 0 to ${MAX_SLOTS}, or left empty.`);
  }
  if (filled(pact.max) && whole(pact.max) > 0 && !(whole(pact.level) >= 1 && whole(pact.level) <= MAX_PACT_LEVEL)) {
    problems.push(`Say the level of the pact slots, 1 to ${MAX_PACT_LEVEL}.`);
  }
  if (hitDice.some((pool) => filled(pool.max) && !(whole(pool.max) >= 1 && whole(pool.max) <= MAX_HIT_DICE))) {
    problems.push(`Hit dice must be 1 to ${MAX_HIT_DICE} of each size, or left empty.`);
  }
  const dice = hitDice.filter((pool) => filled(pool.max)).map((pool) => pool.die);
  if (new Set(dice).size !== dice.length) {
    problems.push("Each size of hit die is listed once; add its dice together.");
  }
  const named = spells.filter((spell) => spell.name.trim());
  if (spells.some((spell) => !spell.name.trim() && (spell.notes.trim() || spell.source.trim()))) {
    problems.push("Give each spell a name, or remove it.");
  }
  if (named.some((spell) => !(whole(spell.level) >= 0 && whole(spell.level) <= 9))) {
    problems.push("A spell's level is 0 (a cantrip) to 9.");
  }
  if (named.length > MAX_SPELLS) {
    problems.push(`A sheet can have up to ${MAX_SPELLS} spells.`);
  }
  return problems;
}

/** The parts of the sheet the spell editor replaces, from the drafts. What is empty is left out. */
export function spellsToSheet({ spellcasting, slots, pact, hitDice, spells }) {
  const sheet = {};
  if (spellcasting) {
    sheet.spellcasting = { ability: spellcasting };
  }
  const slotEntries = SLOT_LEVELS.filter((level) => whole(slots[level].max) > 0).map((level) => {
    const max = whole(slots[level].max);
    return [level, { max, used: Math.min(Number.isNaN(whole(slots[level].used)) ? 0 : whole(slots[level].used), max) }];
  });
  if (slotEntries.length) {
    sheet.slots = Object.fromEntries(slotEntries);
  }
  if (whole(pact.max) > 0) {
    const max = whole(pact.max);
    sheet.pact = { max, used: Math.min(Number.isNaN(whole(pact.used)) ? 0 : whole(pact.used), max), level: whole(pact.level) };
  }
  const pools = hitDice.filter((pool) => filled(pool.max)).map((pool) => {
    const max = whole(pool.max);
    return { die: pool.die, max, used: Math.min(Number.isNaN(whole(pool.used)) ? 0 : whole(pool.used), max) };
  });
  if (pools.length) {
    sheet.hitDice = pools;
  }
  const kept = spells
    .filter((spell) => spell.name.trim())
    .map((spell) => {
      const one = { name: spell.name.trim(), level: whole(spell.level) };
      for (const field of ["key", "school", "castingTime", "range", "duration", "source", "notes"]) {
        if (spell[field].trim()) {
          one[field] = spell[field].trim();
        }
      }
      for (const field of ["concentration", "ritual", "prepared"]) {
        if (spell[field]) {
          one[field] = true;
        }
      }
      return one;
    });
  if (kept.length) {
    sheet.spells = kept;
  }
  return sheet;
}

// ---- play: spending ----

/** The sheet with a slot of this level spent (`by` of 1) or given back (-1), within what there is. */
export function spendSlot(sheet, level, by = 1) {
  const slot = sheet.slots?.[level];
  return slot ? { ...sheet, slots: { ...sheet.slots, [level]: { ...slot, used: Math.min(slot.max, Math.max(0, slot.used + by)) } } } : sheet;
}

/** The same for the pact slots. */
export function spendPact(sheet, by = 1) {
  return sheet.pact ? { ...sheet, pact: { ...sheet.pact, used: Math.min(sheet.pact.max, Math.max(0, sheet.pact.used + by)) } } : sheet;
}

/** The same for one pool of hit dice, by its place in the list. */
export function spendHitDie(sheet, index, by = 1) {
  const hitDice = (sheet.hitDice ?? []).map((pool, at) => (at === index ? { ...pool, used: Math.min(pool.max, Math.max(0, pool.used + by)) } : pool));
  return { ...sheet, hitDice };
}

/** The sheet with the spell's prepared mark turned over. */
export function togglePrepared(sheet, index) {
  return { ...sheet, spells: (sheet.spells ?? []).map((spell, at) => (at === index ? { ...spell, prepared: !spell.prepared } : spell)) };
}

/** The sheet with the pact slots refilled: what a short rest does for them. */
export function refillPact(sheet) {
  return sheet.pact ? { ...sheet, pact: { ...sheet.pact, used: 0 } } : sheet;
}

/** The sheet with every spell slot refilled. */
export function refillSlots(sheet) {
  return sheet.slots ? { ...sheet, slots: Object.fromEntries(Object.entries(sheet.slots).map(([level, slot]) => [level, { ...slot, used: 0 }])) } : sheet;
}

/** How many hit dice a long rest gives back: half of all the character has (rounded down), and at least one. */
export function hitDiceRegained(sheet) {
  const total = (sheet.hitDice ?? []).reduce((sum, pool) => sum + pool.max, 0);
  return total ? Math.max(1, Math.floor(total / 2)) : 0;
}

/** The sheet after a long rest's hit dice: the biggest dice come back first, as many as `hitDiceRegained` says. */
export function regainHitDice(sheet) {
  let left = hitDiceRegained(sheet);
  const order = (sheet.hitDice ?? []).map((pool, index) => ({ index, size: parseInt(pool.die.slice(1), 10) })).sort((a, b) => b.size - a.size);
  const back = new Map();
  for (const { index } of order) {
    const take = Math.min(left, sheet.hitDice[index].used);
    back.set(index, take);
    left -= take;
  }
  return { ...sheet, hitDice: (sheet.hitDice ?? []).map((pool, index) => ({ ...pool, used: pool.used - (back.get(index) ?? 0) })) };
}
