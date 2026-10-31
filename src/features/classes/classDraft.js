// A class or subclass while it's being edited, and back to what the backend takes. Open5e keeps a class as a list of
// features of different types (see classTable.js); the form shows the ones a person writes (abilities, text blocks and
// table columns) and keeps the rest (spell slot columns and the like) as they were.

export const ABILITY_REFS = [
  { key: "strength", name: "Strength" },
  { key: "dexterity", name: "Dexterity" },
  { key: "constitution", name: "Constitution" },
  { key: "intelligence", name: "Intelligence" },
  { key: "wisdom", name: "Wisdom" },
  { key: "charisma", name: "Charisma" },
];

export const HIT_DICE = ["D6", "D8", "D10", "D12"];

export const CASTER_TYPES = [
  { value: "NONE", label: "Not a spellcaster" },
  { value: "THIRD", label: "Third caster" },
  { value: "HALF", label: "Half caster" },
  { value: "FULL", label: "Full caster" },
  { value: "PACT", label: "Pact magic" },
];

export const MAX_LEVEL = 20;

/** The proficiency bonus at each level, as the class table writes it. */
export const proficiencyBonusAt = (level) => `+${2 + Math.floor((level - 1) / 4)}`;

const BLOCKS = [
  { field: "core", type: "CORE_TRAITS_TABLE", name: "Core Traits" },
  { field: "proficiencies", type: "PROFICIENCIES", name: "Proficiencies" },
  { field: "equipment", type: "STARTING_EQUIPMENT", name: "Starting Equipment" },
];

export const BLOCK_FIELDS = BLOCKS.map(({ field }) => field);

export function blankClassDraft() {
  return {
    name: "",
    desc: "",
    subclassOfKey: "",
    subclassOfName: "",
    hitDie: "D8",
    casterType: "NONE",
    savingThrows: [],
    primaryAbilities: [],
    hpFirst: "",
    hpHigher: "",
    core: "",
    proficiencies: "",
    equipment: "",
    proficiencyBonus: true,
    columns: [], // [{name, values}]: one value a line, the first for level 1
    features: [], // [{name, levels, desc}]: levels as typed, "1, 5, 9"
    kept: [], // features of other types, sent back as they were
    crossreferences: null,
  };
}

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The levels in text like "1, 5 and 9": whole numbers, once each, lowest first; NaN in the list for something that isn't one. */
export function parseLevels(text) {
  const parts = String(text).split(/[,;\s]+|and/).map((part) => part.trim()).filter(Boolean);
  return [...new Set(parts.map((part) => (/^\d+$/.test(part) ? parseInt(part, 10) : NaN)))].sort((a, b) => a - b);
}

/** The abilities a list of references names, by the key we use for them, whichever way the source wrote them. */
const refs = (list) =>
  (Array.isArray(list) ? list : [])
    .map((one) => ABILITY_REFS.find((ability) => ability.key === one?.key?.toLowerCase() || ability.name.toLowerCase() === one?.name?.toLowerCase())?.key)
    .filter(Boolean);

/** The draft for a class the backend gave. */
export function draftFromClass(cls) {
  const draft = blankClassDraft();
  const features = cls.features ?? [];
  const text = (type) => features.find((feature) => feature.featureType === type)?.desc ?? "";
  Object.assign(draft, {
    name: cls.name ?? "",
    desc: cls.desc ?? "",
    subclassOfKey: cls.subclassOf?.key ?? "",
    subclassOfName: cls.subclassOf?.name ?? "",
    hitDie: (cls.hitPoints?.hitDice ?? cls.hitDice ?? "D8").toUpperCase(),
    casterType: cls.casterType ?? "NONE",
    savingThrows: refs(cls.savingThrows),
    primaryAbilities: refs(cls.primaryAbilities),
    hpFirst: cls.hitPoints?.hitPointsAt1stLevel ?? "",
    hpHigher: cls.hitPoints?.hitPointsAtHigherLevels ?? "",
    proficiencyBonus: features.some((feature) => feature.featureType === "PROFICIENCY_BONUS"),
    crossreferences: cls.crossreferences ?? null,
  });
  for (const { field, type } of BLOCKS) {
    draft[field] = text(type);
  }
  const blockTypes = new Set(BLOCKS.map(({ type }) => type));
  for (const feature of features) {
    if (blockTypes.has(feature.featureType) || feature.featureType === "PROFICIENCY_BONUS") {
      continue;
    }
    if (feature.featureType === "CLASS_TABLE_DATA") {
      const byLevel = new Map((feature.dataForClassTable ?? []).map((entry) => [entry.level, entry.columnValue]));
      const last = Math.max(0, ...byLevel.keys());
      draft.columns.push({ name: feature.name, values: Array.from({ length: last }, (_, index) => byLevel.get(index + 1) ?? "").join("\n") });
    } else if (feature.featureType === "CLASS_LEVEL_FEATURE" || !feature.featureType) {
      draft.features.push({
        name: feature.name ?? "",
        levels: [...new Set((feature.gainedAt ?? []).map((gained) => gained.level).filter(Number.isInteger))].sort((a, b) => a - b).join(", "),
        desc: feature.desc ?? "",
      });
    } else {
      draft.kept.push(feature);
    }
  }
  return draft;
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function classProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the class a name.");
  }
  if (draft.features.some((feature) => !feature.name.trim())) {
    problems.push("Give each feature a name, or remove it.");
  }
  if (draft.features.some((feature) => parseLevels(feature.levels).some((level) => !(level >= 1 && level <= MAX_LEVEL)))) {
    problems.push(`A feature's levels are whole numbers from 1 to ${MAX_LEVEL}, such as 1, 5, 9.`);
  }
  if (draft.columns.some((column) => !column.name.trim())) {
    problems.push("Give each table column a name, or remove it.");
  }
  if (draft.columns.some((column) => column.values.split(/\r?\n/).length > MAX_LEVEL)) {
    problems.push(`A table column has a value for each level, so up to ${MAX_LEVEL} lines.`);
  }
  const names = draft.features.map((feature) => feature.name.trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) {
    problems.push("Two features have the same name; tell them apart.");
  }
  return problems;
}

/** The class the draft describes, in the shape the backend takes (and the stat block shows). */
export function classFromDraft(draft) {
  const subclass = Boolean(draft.subclassOfKey);
  const features = [];
  const used = new Set();
  const keyFor = (name) => {
    let key = slug(name) || "feature";
    for (let n = 2; used.has(key); n++) {
      key = `${slug(name) || "feature"}-${n}`;
    }
    used.add(key);
    return key;
  };
  if (!subclass) {
    for (const { field, type, name } of BLOCKS) {
      if (draft[field].trim()) {
        features.push({ key: keyFor(name), name, desc: draft[field].trim(), featureType: type });
      }
    }
    if (draft.proficiencyBonus) {
      features.push({
        key: keyFor("Proficiency Bonus"),
        name: "Proficiency Bonus",
        desc: "",
        featureType: "PROFICIENCY_BONUS",
        dataForClassTable: Array.from({ length: MAX_LEVEL }, (_, index) => ({ level: index + 1, columnValue: proficiencyBonusAt(index + 1) })),
      });
    }
    for (const column of draft.columns.filter((one) => one.name.trim())) {
      features.push({
        key: keyFor(column.name),
        name: column.name.trim(),
        desc: "",
        featureType: "CLASS_TABLE_DATA",
        dataForClassTable: column.values
          .split(/\r?\n/)
          .map((value, index) => ({ level: index + 1, columnValue: value.trim() }))
          .filter((entry) => entry.columnValue),
      });
    }
    features.push(...draft.kept);
  }
  for (const feature of draft.features.filter((one) => one.name.trim())) {
    const levels = parseLevels(feature.levels).filter((level) => level >= 1 && level <= MAX_LEVEL);
    features.push({
      key: keyFor(feature.name),
      name: feature.name.trim(),
      desc: feature.desc.trim(),
      featureType: "CLASS_LEVEL_FEATURE",
      ...(levels.length && { gainedAt: levels.map((level) => ({ level, detail: null })) }),
    });
  }
  const chosen = (list) => ABILITY_REFS.filter((ability) => list.includes(ability.key));
  return {
    name: draft.name.trim(),
    desc: draft.desc.trim(),
    features,
    savingThrows: subclass ? [] : chosen(draft.savingThrows),
    subclassOf: subclass ? { key: draft.subclassOfKey, name: draft.subclassOfName } : null,
    hitDice: subclass ? null : draft.hitDie,
    casterType: draft.casterType,
    primaryAbilities: subclass ? [] : chosen(draft.primaryAbilities),
    crossreferences: draft.crossreferences,
    hitPoints: subclass
      ? null
      : {
          hitDice: draft.hitDie,
          hitDiceName: draft.hitDie.toLowerCase(),
          hitPointsAt1stLevel: draft.hpFirst.trim(),
          hitPointsAtHigherLevels: draft.hpHigher.trim(),
        },
  };
}
