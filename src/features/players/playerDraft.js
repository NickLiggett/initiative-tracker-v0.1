// A character while it's being edited, and back to what the backend takes. Numbers are kept as the text typed,
// so a field can be empty or half typed.

import { DEFAULT_RULESET } from "./players";

export const EMPTY_DRAFT = {
  name: "",
  ruleset: DEFAULT_RULESET,
  classes: [{ key: null, name: "", level: "1" }], // at least one row; a row with no name is a level with no class
  speciesKey: null,
  speciesName: "",
  armorClass: "",
  hitPoints: "",
  initiativeBonus: "0",
  notes: "",
  playedBy: "",
};

const USERNAME = /^@?[a-z0-9][a-z0-9-]{0,31}$/i;

/** The draft for a character the backend gave. */
export function toDraft(player) {
  return {
    name: player.name,
    ruleset: player.ruleset,
    classes: player.classes?.length
      ? player.classes.map(({ classKey, className, level }) => ({ key: classKey ?? null, name: className, level: String(level) }))
      : [{ key: player.classKey ?? null, name: player.className ?? "", level: String(player.level) }],
    speciesKey: player.speciesKey ?? null,
    speciesName: player.speciesName ?? "",
    armorClass: player.armorClass == null ? "" : String(player.armorClass),
    hitPoints: player.hitPoints == null ? "" : String(player.hitPoints),
    initiativeBonus: String(player.initiativeBonus),
    notes: player.notes ?? "",
    playedBy: player.playedBy ?? "",
  };
}

/** A new character starting from this one: the same, with a new name, for nobody in particular yet. */
export function duplicateDraft(player) {
  return { ...toDraft(player), name: `${player.name} (copy)`, playedBy: "" };
}

/** A whole number from text like "5" or "+2", or NaN. Blank is NaN too. */
function whole(text) {
  const trimmed = String(text).trim();
  return /^[+-]?\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
}

function problemWithNumber(label, text, min, max, optional = false) {
  if (optional && String(text).trim() === "") {
    return null;
  }
  const value = whole(text);
  return Number.isNaN(value) || value < min || value > max ? `${label} must be ${min} to ${max}.` : null;
}

/** The rows of the draft that name a class. */
function namedClasses(draft) {
  return draft.classes.filter(({ name }) => name.trim());
}

/** The levels in the classes added up, or the one level of a character with no class; NaN if one isn't a number. */
export function totalLevel(draft) {
  const rows = namedClasses(draft);
  return (rows.length ? rows : draft.classes.slice(0, 1)).reduce((sum, { level }) => sum + whole(level), 0);
}

function classProblems(draft) {
  const named = namedClasses(draft);
  const lone = draft.classes.length === 1;
  const problems = draft.classes
    .filter(({ name }) => lone || name.trim())
    .map(({ name, level }) => problemWithNumber(name.trim() ? `Level in ${name.trim()}` : "Level", level, 1, 20));
  if (!lone && named.length < draft.classes.length) {
    problems.push("Name each class, or remove the empty one.");
  }
  const names = named.map(({ name }) => name.trim().toLowerCase());
  const twice = names.findIndex((name, index) => names.indexOf(name) !== index);
  if (twice >= 0) {
    problems.push(`${named[names.indexOf(names[twice])].name.trim()} is listed twice; use one row and add up its levels.`);
  }
  const total = totalLevel(draft);
  if (!problems.some(Boolean) && total > 20) {
    problems.push(`The levels add up to ${total}; 20 is the most.`);
  }
  return problems;
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function draftProblems(draft) {
  return [
    draft.name.trim() ? null : "Give the character a name.",
    ...classProblems(draft),
    problemWithNumber("Armor class", draft.armorClass, 0, 40, true),
    problemWithNumber("Hit points", draft.hitPoints, 0, 9999, true),
    problemWithNumber("Initiative bonus", draft.initiativeBonus, -10, 30),
    draft.playedBy.trim() && !USERNAME.test(draft.playedBy.trim()) ? "The player's username has letters, digits and hyphens only." : null,
  ].filter(Boolean);
}

/** The body to send the backend. Call it only when `draftProblems` is empty. */
export function toRequest(draft) {
  const optionalNumber = (text) => (String(text).trim() === "" ? null : whole(text));
  const optionalText = (text) => text.trim() || null;
  const speciesName = optionalText(draft.speciesName);
  const classes = namedClasses(draft).map(({ key, name, level }) => ({ classKey: key, className: name.trim(), level: whole(level) }));
  return {
    name: draft.name.trim(),
    ruleset: draft.ruleset,
    classKey: classes[0]?.classKey ?? null,
    className: classes[0]?.className ?? null,
    classes,
    speciesKey: speciesName ? draft.speciesKey : null,
    speciesName,
    level: totalLevel(draft),
    armorClass: optionalNumber(draft.armorClass),
    hitPoints: optionalNumber(draft.hitPoints),
    initiativeBonus: whole(draft.initiativeBonus),
    notes: optionalText(draft.notes),
    playedBy: optionalText(draft.playedBy)?.replace(/^@+/, "").toLowerCase() ?? null,
  };
}

/** The character a draft describes, shaped like the backend's, for showing a preview. */
export function previewOf(draft, existing) {
  const valid = (text, fallback) => (Number.isNaN(whole(text)) ? fallback : whole(text));
  const request = toRequest({
    ...draft,
    classes: draft.classes.map((row) => ({ ...row, level: String(valid(row.level, 1)) })),
    initiativeBonus: String(valid(draft.initiativeBonus, 0)),
  });
  return {
    ...request,
    id: existing?.id ?? 0,
    name: request.name || "Unnamed character",
    owner: existing?.owner ?? null,
    role: existing?.role ?? "OWNER",
    armorClass: Number.isNaN(request.armorClass) ? null : request.armorClass,
    hitPoints: Number.isNaN(request.hitPoints) ? null : request.hitPoints,
  };
}
