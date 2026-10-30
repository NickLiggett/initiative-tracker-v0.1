// The lists on a character's sheet: attacks, and features and traits (with uses that come back on a rest).
//
//   attacks    [{name, bonus, damage, notes}]: text as it is written on the sheet ("+9", "1d8+5 slashing")
//   features   [{name, source, description, uses: {max, used, per}}]: `uses` only for a limited one; `per` is "short" or "long"

export const MAX_ATTACKS = 50;
export const MAX_FEATURES = 200;
export const MAX_USES = 99;

export const RESTS = [
  { key: "short", label: "Short rest" },
  { key: "long", label: "Long rest" },
];

const text = (value) => (typeof value === "string" ? value : "");

/** The attack rows of the editor for the attacks on the sheet. */
export function attackDrafts(attacks) {
  return (Array.isArray(attacks) ? attacks : []).map((one) => ({ name: text(one?.name), bonus: text(one?.bonus), damage: text(one?.damage), notes: text(one?.notes) }));
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
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)));
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

/** The sheet after a rest: a short rest gives back the uses that come back on one, and a long rest all of them. */
export function takeRest(sheet, rest) {
  const features = (sheet.features ?? []).map((feature) =>
    feature.uses && (rest === "long" || feature.uses.per === "short") ? { ...feature, uses: { ...feature.uses, used: 0 } } : feature,
  );
  return { ...sheet, features };
}

/** Whether a rest would give anything back: used up uses that come back on it. */
export function restWouldHelp(sheet, rest) {
  return (sheet.features ?? []).some((feature) => feature.uses && feature.uses.used > 0 && (rest === "long" || feature.uses.per === "short"));
}
