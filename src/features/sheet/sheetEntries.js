// The lists on a character's sheet: attacks, and features and traits (with uses that come back on a rest).
//
//   attacks    [{name, bonus, damage, notes, type}]: text as it is written on the sheet ("+9", "1d8+5 slashing"); `type` is
//              "action" or "bonus" for something that isn't an attack (left out for an attack)
//   features   [{name, source, description, uses: {max, used, per}}]: `uses` only for a limited one; `per` is "short" or "long"

export const MAX_ATTACKS = 50;
export const MAX_FEATURES = 200;
export const MAX_USES = 99;

const text = (value) => (typeof value === "string" ? value : "");

/** What an entry of the Actions tab is, as the chips there sort them. An attack is the one that isn't written down. */
export const ATTACK_TYPES = [
  { key: "attack", label: "Attack" },
  { key: "action", label: "Action" },
  { key: "bonus", label: "Bonus Action" },
];

/** The type of an attack as it is on the sheet: "attack" unless it says otherwise. */
export const attackType = (attack) => (ATTACK_TYPES.some(({ key }) => key === attack?.type) ? attack.type : "attack");

/** The attack rows of the editor for the attacks on the sheet. */
export function attackDrafts(attacks) {
  return (Array.isArray(attacks) ? attacks : []).map((one) => ({ name: text(one?.name), bonus: text(one?.bonus), damage: text(one?.damage), notes: text(one?.notes), type: attackType(one) }));
}

/** The feature rows of the editor for the features on the sheet. */
export function featureDrafts(features) {
  return (Array.isArray(features) ? features : []).map((one) => ({
    name: text(one?.name),
    source: text(one?.source),
    description: text(one?.description),
    max: Number.isFinite(one?.uses?.max) ? String(one.uses.max) : "",
    per: one?.uses?.per === "short" || one?.uses?.per === "long" ? one.uses.per : "",
    used: Number.isFinite(one?.uses?.used) ? String(one.uses.used) : "0",
  }));
}

const wholeNumber = (value) => (/^\d+$/.test(String(value).trim()) ? parseInt(value, 10) : NaN);
const blank = (row, fields) => fields.every((field) => !String(row[field]).trim());

/** What stops these lists from being saved: sentences, none when they can be. */
export function listProblems({ attacks, features }) {
  const problems = [];
  const attackRows = attacks.filter((row) => !blank(row, ["name", "bonus", "damage", "notes"]));
  const featureRows = features.filter((row) => !blank(row, ["name", "source", "description", "max"]));
  if (attackRows.some((row) => !row.name.trim())) {
    problems.push("Give each attack a name, or remove it.");
  }
  if (attackRows.length > MAX_ATTACKS) {
    problems.push(`A sheet can have up to ${MAX_ATTACKS} attacks.`);
  }
  if (featureRows.some((row) => !row.name.trim())) {
    problems.push("Give each feature a name, or remove it.");
  }
  if (featureRows.length > MAX_FEATURES) {
    problems.push(`A sheet can have up to ${MAX_FEATURES} features.`);
  }
  if (featureRows.some((row) => String(row.max).trim() !== "" && !(wholeNumber(row.max) >= 1 && wholeNumber(row.max) <= MAX_USES))) {
    problems.push(`Uses must be 1 to ${MAX_USES}, or left empty for a feature that isn't limited.`);
  }
  if (featureRows.some((row) => String(row.max).trim() !== "" && !row.per)) {
    problems.push("Say when the uses come back (short rest or long rest), or clear the uses.");
  }
  return problems;
}

/** The attacks to keep for the editor's rows: the ones with something written, each with what it has. */
export function attacksToSheet(rows) {
  return rows
    .filter((row) => !blank(row, ["name", "bonus", "damage", "notes"]))
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()]).filter(([key, value]) => value && !(key === "type" && value === "attack"))));
}

/** The features to keep for the editor's rows. Uses spent are kept, never more than there are. */
export function featuresToSheet(rows) {
  return rows
    .filter((row) => !blank(row, ["name", "source", "description", "max"]))
    .map((row) => {
      const feature = Object.fromEntries(["name", "source", "description"].map((key) => [key, row[key].trim()]).filter(([, value]) => value));
      if (String(row.max).trim() !== "") {
        const max = wholeNumber(row.max);
        feature.uses = { max, used: Math.min(Number.isNaN(wholeNumber(row.used)) ? 0 : wholeNumber(row.used), max), per: row.per };
      }
      return feature;
    });
}

/** How many uses of a feature are left, or null when it isn't limited. */
export function usesLeft(feature) {
  return feature?.uses ? Math.max(0, feature.uses.max - feature.uses.used) : null;
}

/** The sheet with one more use of the feature spent (`by` of 1), or given back (-1); never below none spent or above all. */
export function spendUse(sheet, index, by = 1) {
  const features = (sheet.features ?? []).map((feature, at) =>
    at === index && feature.uses ? { ...feature, uses: { ...feature.uses, used: Math.min(feature.uses.max, Math.max(0, feature.uses.used + by)) } } : feature,
  );
  return { ...sheet, features };
}

/** A blank row for the dialog that adds an attack, or a feature. */
export const blankAttack = () => ({ name: "", bonus: "", damage: "", notes: "", type: "attack" });
export const blankFeature = () => ({ name: "", source: "", description: "", max: "", per: "", used: "0" });

/** The sheet with the list `key` having `entry` at `index`, or added at the end when `index` is null. */
function withEntry(sheet, key, index, entry) {
  const list = [...(sheet[key] ?? [])];
  if (index === null) {
    list.push(entry);
  } else {
    list[index] = entry;
  }
  return { ...sheet, [key]: list };
}

/** The sheet without the entry at `index` of the list `key`; the list is left out when that was its last. */
function withoutEntry(sheet, key, index) {
  const { [key]: old, ...rest } = sheet;
  const list = (old ?? []).filter((entry, at) => at !== index);
  return list.length ? { ...rest, [key]: list } : rest;
}

/** The sheet with this attack (the dialog's row) added (`index` null) or in place of the one at `index`. */
export const withAttack = (sheet, index, row) => withEntry(sheet, "attacks", index, attacksToSheet([row])[0]);
export const withoutAttack = (sheet, index) => withoutEntry(sheet, "attacks", index);

/** The same for a feature; the uses spent are kept as the row has them. */
export const withFeature = (sheet, index, row) => withEntry(sheet, "features", index, featuresToSheet([row])[0]);
export const withoutFeature = (sheet, index) => withoutEntry(sheet, "features", index);

