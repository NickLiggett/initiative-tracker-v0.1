// The rest of a character's sheet (`sheet` on the character): what the backend keeps as JSON and the app shapes, and the
// numbers worked out from it and the character's level. Nothing worked out is stored.
//
//   abilities    {str, dex, con, int, wis, cha}: scores
//   saves        ["dex", "int"]: the abilities the character is proficient in the saving throw of
//   skills       {stealth: "proficient" | "expertise"}: a skill left out is not proficient
//   speed        {walk: 30, other: "fly 30 ft."}
//   senses       ["Darkvision 120 ft."]
//   defenses     {resistances, immunities, vulnerabilities}: lists of text
//   training     {armor, weapons, tools, languages}: lists of text
//   attacks      [{name, bonus, damage, notes}] and features [{name, source, description, uses}]: see sheetEntries.js
//   spellcasting, slots, pact, hitDice, spells: see sheetCasting.js
//   adjustments  {"save.dex": {bonus, note}, ...}: see sheetAdjust.js
//   personal     {gender, age, size, height, weight, alignment, faith, skin, eyes, hair, appearance, allies, traits,
//                ideals, bonds, flaws, backstory}: text

import { adjustmentBonus, adjustmentDrafts, adjustmentProblems, adjustmentsToSheet } from "./sheetAdjust";
import { spellDrafts, spellProblems, spellsToSheet } from "./sheetCasting";
import { attackDrafts, attacksToSheet, featureDrafts, featuresToSheet, listProblems } from "./sheetEntries";

export const ABILITIES = [
  { key: "str", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
];

export const SKILLS = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animalHandling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

export const PASSIVES = [
  { skill: "perception", label: "Passive Perception" },
  { skill: "insight", label: "Passive Insight" },
  { skill: "investigation", label: "Passive Investigation" },
];

export const DEFENSE_LISTS = [
  { key: "resistances", label: "Resistances" },
  { key: "immunities", label: "Immunities" },
  { key: "vulnerabilities", label: "Vulnerabilities" },
];

export const TRAINING_LISTS = [
  { key: "armor", label: "Armor" },
  { key: "weapons", label: "Weapons" },
  { key: "tools", label: "Tools" },
  { key: "languages", label: "Languages" },
];

/** The short facts about the person, one line each. */
export const PERSONAL_LINES = [
  { key: "gender", label: "Gender" },
  { key: "age", label: "Age" },
  { key: "size", label: "Size" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "alignment", label: "Alignment" },
  { key: "faith", label: "Faith" },
  { key: "skin", label: "Skin" },
  { key: "eyes", label: "Eyes" },
  { key: "hair", label: "Hair" },
];

/** The longer texts, each a box of its own. */
export const PERSONAL_TEXTS = [
  { key: "appearance", label: "Appearance" },
  { key: "allies", label: "Allies and organizations" },
  { key: "traits", label: "Personality traits" },
  { key: "ideals", label: "Ideals" },
  { key: "bonds", label: "Bonds" },
  { key: "flaws", label: "Flaws" },
  { key: "backstory", label: "Backstory" },
];

export const MIN_SCORE = 1;
export const MAX_SCORE = 30;

/** The modifier of an ability score: 10 and 11 are +0, 12 and 13 are +1, 8 and 9 are -1. */
export function modifier(score) {
  return Math.floor((score - 10) / 2);
}

/** The proficiency bonus of a character of this level: +2 at 1st, up one every four levels, +6 at 17th. */
export function proficiencyBonus(level) {
  return 2 + Math.floor((Math.min(Math.max(level, 1), 20) - 1) / 4);
}

/** A bonus the way it is written on a sheet: +2, +0, -1. */
export function signed(number) {
  return number < 0 ? `${number}` : `+${number}`;
}

const score = (sheet, ability) => (Number.isFinite(sheet?.abilities?.[ability]) ? sheet.abilities[ability] : null);

/** The modifier of an ability, or null when its score hasn't been filled in. */
export function abilityModifier(sheet, ability) {
  const value = score(sheet, ability);
  return value === null ? null : modifier(value);
}

/** The saving throw bonus of an ability: its modifier, and the proficiency bonus if the character is proficient. Null without the score. */
export function saveBonus(sheet, ability, level) {
  const base = abilityModifier(sheet, ability);
  return base === null ? null : base + ((sheet.saves ?? []).includes(ability) ? proficiencyBonus(level) : 0) + adjustmentBonus(sheet, `save.${ability}`);
}

/** "proficient", "expertise" or "none". */
export function skillLevel(sheet, skill) {
  const marked = sheet?.skills?.[skill];
  return marked === "proficient" || marked === "expertise" ? marked : "none";
}

/** The sheet with the saving throw of this ability turned on, or off if it was on. */
export function withSaveToggled(sheet, ability) {
  const on = (sheet.saves ?? []).includes(ability);
  const saves = ABILITIES.map(({ key }) => key).filter((key) => (key === ability ? !on : (sheet.saves ?? []).includes(key)));
  const { saves: old, ...rest } = sheet;
  return saves.length ? { ...rest, saves } : rest;
}

const SKILL_STEPS = ["none", "proficient", "expertise"];

/** The sheet with this skill taken one step on: not proficient, proficient, expertise, and round again. */
export function withSkillCycled(sheet, skill) {
  const next = SKILL_STEPS[(SKILL_STEPS.indexOf(skillLevel(sheet, skill)) + 1) % SKILL_STEPS.length];
  const { skills: old, ...rest } = sheet;
  const skills = Object.fromEntries(Object.entries(old ?? {}).filter(([key]) => key !== skill));
  if (next !== "none") {
    skills[skill] = next;
  }
  return Object.keys(skills).length ? { ...rest, skills } : rest;
}

/** The bonus of a skill: its ability's modifier, plus the proficiency bonus, or twice it for expertise. Null without the score. */
export function skillBonus(sheet, skill, level) {
  const base = abilityModifier(sheet, SKILLS.find(({ key }) => key === skill).ability);
  if (base === null) {
    return null;
  }
  const bonus = proficiencyBonus(level);
  return base + { none: 0, proficient: bonus, expertise: 2 * bonus }[skillLevel(sheet, skill)] + adjustmentBonus(sheet, `skill.${skill}`);
}

/** 10 plus the bonus of the skill, or null without the score. */
export function passiveScore(sheet, skill, level) {
  const bonus = skillBonus(sheet, skill, level);
  return bonus === null ? null : 10 + bonus + adjustmentBonus(sheet, `passive.${skill}`);
}

/** The sheet as the editor works on it: every field present, scores and speed as the text typed, lists as text with one entry a line. */
export function toSheetDraft(sheet = {}) {
  const lines = (list) => (Array.isArray(list) ? list.join("\n") : "");
  const text = (group, key) => (typeof sheet?.[group]?.[key] === "string" ? sheet[group][key] : "");
  return {
    abilities: Object.fromEntries(ABILITIES.map(({ key }) => [key, Number.isFinite(sheet?.abilities?.[key]) ? String(sheet.abilities[key]) : ""])),
    saves: Array.isArray(sheet?.saves) ? sheet.saves.filter((key) => ABILITIES.some((ability) => ability.key === key)) : [],
    skills: Object.fromEntries(SKILLS.map(({ key }) => [key, skillLevel(sheet, key)])),
    speed: { walk: Number.isFinite(sheet?.speed?.walk) ? String(sheet.speed.walk) : "", other: text("speed", "other") },
    senses: lines(sheet?.senses),
    defenses: Object.fromEntries(DEFENSE_LISTS.map(({ key }) => [key, lines(sheet?.defenses?.[key])])),
    training: Object.fromEntries(TRAINING_LISTS.map(({ key }) => [key, lines(sheet?.training?.[key])])),
    personal: Object.fromEntries([...PERSONAL_LINES, ...PERSONAL_TEXTS].map(({ key }) => [key, text("personal", key)])),
    attacks: attackDrafts(sheet?.attacks),
    features: featureDrafts(sheet?.features),
    ...spellDrafts(sheet),
    adjustments: adjustmentDrafts(sheet),
  };
}

const wholeNumber = (text) => (/^\d+$/.test(String(text).trim()) ? parseInt(text, 10) : NaN);

/** What stops a draft from being saved: sentences, none when it can be. */
export function sheetProblems(draft) {
  const problems = [];
  for (const { key, label } of ABILITIES) {
    const text = draft.abilities[key];
    if (String(text).trim() !== "" && !(wholeNumber(text) >= MIN_SCORE && wholeNumber(text) <= MAX_SCORE)) {
      problems.push(`${label} must be ${MIN_SCORE} to ${MAX_SCORE}, or left empty.`);
    }
  }
  if (String(draft.speed.walk).trim() !== "" && !(wholeNumber(draft.speed.walk) <= 999)) {
    problems.push("Walking speed must be 0 to 999 feet, or left empty.");
  }
  return [...problems, ...listProblems(draft), ...spellProblems(draft), ...adjustmentProblems(draft.adjustments)];
}

const entries = (text) =>
  String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** The parts of the sheet the editor shows, which it replaces; anything else on the sheet (added later) is kept as it was. */
const EDITED = ["abilities", "saves", "skills", "speed", "senses", "defenses", "training", "personal", "attacks", "features", "spellcasting", "slots", "pact", "hitDice", "spells", "adjustments"];

/**
 * The sheet to send the backend for a draft, from the sheet it was opened from. Call it only when `sheetProblems` is
 * empty. What the draft leaves empty is left out.
 */
export function toSheet(draft, existing = {}) {
  const sheet = Object.fromEntries(Object.entries(existing ?? {}).filter(([key]) => !EDITED.includes(key)));
  const abilities = Object.fromEntries(ABILITIES.filter(({ key }) => String(draft.abilities[key]).trim() !== "").map(({ key }) => [key, wholeNumber(draft.abilities[key])]));
  if (Object.keys(abilities).length) {
    sheet.abilities = abilities;
  }
  if (draft.saves.length) {
    sheet.saves = ABILITIES.map(({ key }) => key).filter((key) => draft.saves.includes(key));
  }
  const skills = Object.fromEntries(Object.entries(draft.skills).filter(([, level]) => level !== "none"));
  if (Object.keys(skills).length) {
    sheet.skills = skills;
  }
  const speed = {};
  if (String(draft.speed.walk).trim() !== "") {
    speed.walk = wholeNumber(draft.speed.walk);
  }
  if (draft.speed.other.trim()) {
    speed.other = draft.speed.other.trim();
  }
  if (Object.keys(speed).length) {
    sheet.speed = speed;
  }
  if (entries(draft.senses).length) {
    sheet.senses = entries(draft.senses);
  }
  for (const [group, lists] of [["defenses", DEFENSE_LISTS], ["training", TRAINING_LISTS]]) {
    const kept = Object.fromEntries(lists.filter(({ key }) => entries(draft[group][key]).length).map(({ key }) => [key, entries(draft[group][key])]));
    if (Object.keys(kept).length) {
      sheet[group] = kept;
    }
  }
  const personal = Object.fromEntries(Object.entries(draft.personal).filter(([, text]) => text.trim()).map(([key, text]) => [key, text.trim()]));
  if (Object.keys(personal).length) {
    sheet.personal = personal;
  }
  const attacks = attacksToSheet(draft.attacks);
  if (attacks.length) {
    sheet.attacks = attacks;
  }
  const features = featuresToSheet(draft.features);
  if (features.length) {
    sheet.features = features;
  }
  return { ...sheet, ...spellsToSheet(draft), ...adjustmentsToSheet(draft.adjustments) };
}
