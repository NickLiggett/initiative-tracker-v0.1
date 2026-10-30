// Adjustments to worked-out numbers, for homebrew that breaks the rules: a cloak that adds +1 to every saving throw, a feat
// that adds 5 to passive Perception, "advantage on Religion checks" that no number can say.
//
//   adjustments  {"save.dex": {bonus: 1, note: "Cloak of Protection"}, "skill.religion": {note: "Advantage"}, ...}
//
// A target is `save.<ability>`, `skill.<skill>`, `passive.<skill>` (on top of the skill's own), `spell.dc` or `spell.attack`.
// A bonus is added to the number the sheet works out; a note is shown beside it. Either may be left out, not both.

import { ABILITIES, PASSIVES, SKILLS } from "./sheetModel";

export const MAX_ADJUSTMENT = 20;
export const MAX_NOTE = 200;

/** Every number that can be adjusted, as `{key, label, group}`, in the order the sheet shows them. */
export function adjustmentTargets() {
  return [
    ...ABILITIES.map(({ key, label }) => ({ key: `save.${key}`, label: `${label} saving throw`, group: "Saving throws" })),
    ...SKILLS.map(({ key, label }) => ({ key: `skill.${key}`, label, group: "Skills" })),
    ...PASSIVES.map(({ skill, label }) => ({ key: `passive.${skill}`, label, group: "Passive scores" })),
    { key: "spell.dc", label: "Spell save DC", group: "Spellcasting" },
    { key: "spell.attack", label: "Spell attack bonus", group: "Spellcasting" },
  ];
}

/** The adjustment of a number: `{bonus, note}`, a bonus of 0 and no note when there is none. */
export function adjustmentFor(sheet, key) {
  const one = sheet?.adjustments?.[key];
  return { bonus: Number.isInteger(one?.bonus) ? one.bonus : 0, note: typeof one?.note === "string" ? one.note : "" };
}

/** The bonus of an adjustment, 0 if there is none. */
export const adjustmentBonus = (sheet, key) => adjustmentFor(sheet, key).bonus;

/** The adjustment in words for beside the number: "+2 Cloak of Protection", "Advantage", "-1"; empty if there is none. */
export function adjustmentText(sheet, key) {
  const { bonus, note } = adjustmentFor(sheet, key);
  return [bonus ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : null, note || null].filter(Boolean).join(" ");
}

// ---- the editor's drafts ----

/** The rows of the editor for the adjustments of a sheet, in the order of the targets; anything not a known target is dropped. */
export function adjustmentDrafts(sheet = {}) {
  return adjustmentTargets()
    .filter(({ key }) => sheet?.adjustments?.[key])
    .map(({ key }) => {
      const { bonus, note } = adjustmentFor(sheet, key);
      return { target: key, bonus: bonus ? String(bonus) : "", note };
    });
}

const wholeSigned = (text) => (/^[+-]?\d+$/.test(String(text).trim()) ? parseInt(text, 10) : NaN);

/** What stops these rows from being saved: sentences, none when they can be. */
export function adjustmentProblems(rows) {
  const problems = [];
  const chosen = rows.filter((row) => row.target);
  if (rows.some((row) => !row.target && (row.bonus.trim() || row.note.trim()))) {
    problems.push("Choose what each adjustment is for, or remove it.");
  }
  if (new Set(chosen.map((row) => row.target)).size !== chosen.length) {
    problems.push("Each number is adjusted once; add its bonuses together.");
  }
  if (chosen.some((row) => row.bonus.trim() !== "" && !(Math.abs(wholeSigned(row.bonus)) <= MAX_ADJUSTMENT))) {
    problems.push(`A bonus must be a whole number from -${MAX_ADJUSTMENT} to +${MAX_ADJUSTMENT}.`);
  }
  if (chosen.some((row) => !row.bonus.trim() && !row.note.trim())) {
    problems.push("Give each adjustment a bonus or a note, or remove it.");
  }
  if (chosen.some((row) => row.note.length > MAX_NOTE)) {
    problems.push(`A note can be up to ${MAX_NOTE} characters.`);
  }
  return problems;
}

/** The `adjustments` to keep for the rows: a bonus of 0 is no bonus. Nothing for rows with nothing in them. */
export function adjustmentsToSheet(rows) {
  const entries = rows
    .filter((row) => row.target && (row.bonus.trim() || row.note.trim()))
    .map((row) => {
      const one = {};
      if (row.bonus.trim() && wholeSigned(row.bonus) !== 0) {
        one.bonus = wholeSigned(row.bonus);
      }
      if (row.note.trim()) {
        one.note = row.note.trim();
      }
      return [row.target, one];
    })
    .filter(([, one]) => Object.keys(one).length);
  return entries.length ? { adjustments: Object.fromEntries(entries) } : {};
}
