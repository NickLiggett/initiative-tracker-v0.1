// A class's level table and feature list, worked out from its features, as plain functions.
//
// Open5e keeps a class as a list of features of different types: most are the class's abilities ("Second Wind", gained at
// the levels in `gainedAt`), but some only stand for a column of the class table (the proficiency bonus, the cantrips
// known, each level of spell slots) and some for a block of text (proficiencies, starting equipment, core traits).

/** The feature types that aren't abilities: they are shown in the table or in a block of their own. */
const NOT_ABILITIES = new Set(["SPELL_SLOTS", "CLASS_TABLE_DATA", "PROFICIENCY_BONUS", "CORE_TRAITS_TABLE", "PROFICIENCIES", "STARTING_EQUIPMENT"]);

export const MAX_LEVEL = 20;

/** The levels a feature is gained at, once each, lowest first. */
export function levelsOf(feature) {
  return [...new Set((feature.gainedAt ?? []).map((gained) => gained.level).filter(Number.isInteger))].sort((a, b) => a - b);
}

/** The class's abilities: those of its features that aren't table columns or blocks of text, by the level first gained. */
export function classAbilities(cls) {
  return (cls.features ?? [])
    .filter((feature) => !NOT_ABILITIES.has(feature.featureType))
    .map((feature) => ({ ...feature, levels: levelsOf(feature) }))
    .sort((a, b) => (a.levels[0] ?? MAX_LEVEL + 1) - (b.levels[0] ?? MAX_LEVEL + 1) || a.name.localeCompare(b.name));
}

/** The text of the class's feature of this type ("PROFICIENCIES", "STARTING_EQUIPMENT", "CORE_TRAITS_TABLE"), or "". */
export function textOf(cls, featureType) {
  return (cls.features ?? []).find((feature) => feature.featureType === featureType)?.desc?.trim() ?? "";
}

/** A spell level's rank from its name: "1st" is 1, "9th" is 9, anything else is last. */
function rank(name) {
  const match = /^(\d+)/.exec(name ?? "");
  return match ? Number(match[1]) : 99;
}

/** A feature's table values by level. */
function valuesByLevel(feature) {
  return new Map((feature.dataForClassTable ?? []).filter((entry) => Number.isInteger(entry.level)).map((entry) => [entry.level, entry.columnValue]));
}

/**
 * The class table: a row for each level, with its ability names and the values of every column the class has.
 *
 * `columns` are the columns after the level and the features, in the order shown: the proficiency bonus, the class's own
 * (Cantrips Known, Second Wind, ...) and the spell slots by spell level, which are grouped under "Spell slots".
 * A subclass has no table (nothing but its features): this gives null.
 *
 * @returns {?{columns: {key: string, label: string, group: ?string}[], rows: {level: number, features: string[], values: Object<string, string>}[]}}
 */
export function levelTable(cls) {
  if (cls.subclassOf) {
    return null;
  }
  const features = cls.features ?? [];
  const columns = [];
  const columnValues = new Map();
  const add = (feature, label, group) => {
    const key = `${feature.key ?? feature.name}`;
    columns.push({ key, label, group });
    columnValues.set(key, valuesByLevel(feature));
  };

  for (const feature of features.filter((one) => one.featureType === "PROFICIENCY_BONUS")) {
    add(feature, "Proficiency Bonus", null);
  }
  for (const feature of features.filter((one) => one.featureType === "CLASS_TABLE_DATA")) {
    add(feature, feature.name, null);
  }
  for (const feature of features.filter((one) => one.featureType === "SPELL_SLOTS").sort((a, b) => rank(a.name) - rank(b.name))) {
    add(feature, feature.name, "Spell slots");
  }

  const abilities = classAbilities(cls);
  const seenLevels = [
    ...abilities.flatMap((ability) => ability.levels),
    ...[...columnValues.values()].flatMap((values) => [...values.keys()]),
  ];
  const last = Math.min(MAX_LEVEL, Math.max(0, ...seenLevels)) || MAX_LEVEL;

  const rows = Array.from({ length: last }, (_, index) => {
    const level = index + 1;
    return {
      level,
      features: abilities.filter((ability) => ability.levels.includes(level)).map((ability) => ability.name),
      values: Object.fromEntries(columns.map((column) => [column.key, columnValues.get(column.key).get(level) ?? "—"])),
    };
  });
  return { columns, rows };
}
