// A player character while it's being edited, and back to what the backend takes. Numbers are kept as the text typed,
// so a field can be empty or half typed.

import { DEFAULT_RULESET } from "./players";

export const EMPTY_DRAFT = {
  name: "",
  ruleset: DEFAULT_RULESET,
  classKey: null,
  className: "",
  speciesKey: null,
  speciesName: "",
  level: "1",
  armorClass: "",
  hitPoints: "",
  initiativeBonus: "0",
  notes: "",
  playedBy: "",
};

const USERNAME = /^@?[a-z0-9][a-z0-9-]{0,31}$/i;

/** The draft for a player the backend gave. */
export function toDraft(player) {
  return {
    name: player.name,
    ruleset: player.ruleset,
    classKey: player.classKey ?? null,
    className: player.className ?? "",
    speciesKey: player.speciesKey ?? null,
    speciesName: player.speciesName ?? "",
    level: String(player.level),
    armorClass: player.armorClass == null ? "" : String(player.armorClass),
    hitPoints: player.hitPoints == null ? "" : String(player.hitPoints),
    initiativeBonus: String(player.initiativeBonus),
    notes: player.notes ?? "",
    playedBy: player.playedBy ?? "",
  };
}

/** A new player starting from this one: the same, with a new name, for nobody in particular yet. */
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

/** What stops this draft from being saved: sentences, none when it can be. */
export function draftProblems(draft) {
  return [
    draft.name.trim() ? null : "Give the player a name.",
    problemWithNumber("Level", draft.level, 1, 20),
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
  const className = optionalText(draft.className);
  const speciesName = optionalText(draft.speciesName);
  return {
    name: draft.name.trim(),
    ruleset: draft.ruleset,
    classKey: className ? draft.classKey : null,
    className,
    speciesKey: speciesName ? draft.speciesKey : null,
    speciesName,
    level: whole(draft.level),
    armorClass: optionalNumber(draft.armorClass),
    hitPoints: optionalNumber(draft.hitPoints),
    initiativeBonus: whole(draft.initiativeBonus),
    notes: optionalText(draft.notes),
    playedBy: optionalText(draft.playedBy)?.replace(/^@+/, "").toLowerCase() ?? null,
  };
}

/** The player a draft describes, shaped like the backend's, for showing a preview. */
export function previewOf(draft, existing) {
  const valid = (text, fallback) => (Number.isNaN(whole(text)) ? fallback : whole(text));
  const request = toRequest({ ...draft, level: String(valid(draft.level, 1)), initiativeBonus: String(valid(draft.initiativeBonus, 0)) });
  return {
    ...request,
    id: existing?.id ?? 0,
    name: request.name || "Unnamed player",
    owner: existing?.owner ?? null,
    role: existing?.role ?? "OWNER",
    armorClass: Number.isNaN(request.armorClass) ? null : request.armorClass,
    hitPoints: Number.isNaN(request.hitPoints) ? null : request.hitPoints,
  };
}
