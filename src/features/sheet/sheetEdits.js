// Changes to one part of a sheet, from the text a person typed beside it (see EditableField). Each gives the sheet as it
// would then be, leaving the rest of it alone, and leaves out what is left empty, as sheetModel's toSheet does.

const entries = (text) =>
  String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** An object without one key, or without itself (undefined) when nothing is left. */
function without(object, key) {
  const { [key]: dropped, ...rest } = object ?? {};
  return Object.keys(rest).length ? rest : undefined;
}

/** The sheet with `group` (an object such as `personal`) holding `value` for `key`, or without it when `value` is empty. */
function withGroupValue(sheet, group, key, value) {
  const { [group]: old, ...rest } = sheet;
  const next = value === undefined ? without(old, key) : { ...old, [key]: value };
  return next ? { ...rest, [group]: next } : rest;
}

/** What stops a walking speed from being saved: a sentence, or null. Empty is allowed. */
export function walkProblem(text) {
  return String(text).trim() === "" || (/^\d+$/.test(String(text).trim()) && parseInt(text, 10) <= 999) ? null : "Whole feet, 0 to 999, or empty.";
}

/** The sheet with this walking speed (text of whole feet; empty takes it away). Call it only when `walkProblem` is null. */
export function withWalkingSpeed(sheet, text) {
  return withGroupValue(sheet, "speed", "walk", String(text).trim() === "" ? undefined : parseInt(text, 10));
}

/** The sheet with this other speed ("fly 30 ft."; empty takes it away). */
export function withOtherSpeed(sheet, text) {
  return withGroupValue(sheet, "speed", "other", text.trim() || undefined);
}

/** The sheet with these senses, one a line. */
export function withSenses(sheet, text) {
  const { senses, ...rest } = sheet;
  return entries(text).length ? { ...rest, senses: entries(text) } : rest;
}

/** The sheet with a list of `defenses` or `training` (`key` being `resistances`, `languages` and the like) of these lines. */
export function withListEntry(sheet, group, key, text) {
  return withGroupValue(sheet, group, key, entries(text).length ? entries(text) : undefined);
}

/** The sheet with one personal detail (`alignment`, `backstory`...). */
export function withPersonal(sheet, key, text) {
  return withGroupValue(sheet, "personal", key, text.trim() || undefined);
}
