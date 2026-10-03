// The creature editor's form state, and turning it into what open5e-backend stores.
//
// The backend keeps derived numbers (modifiers, saves, passive perception, ...) as plain columns instead of working
// them out, so a creature saved from here has to carry them. A draft starts from an existing creature (when
// editing or duplicating) and its fields the form doesn't show are kept as they were.

import { ABILITY_ORDER, ACTION_TYPES, abilityModifier, actionsOfType, proficiencyBonusFor } from "./creatureFormat";

export const SPEED_MODES = ["walk", "fly", "swim", "climb", "burrow", "crawl"];

/** The modes a creature moves at half its walking speed in, unless it says otherwise (see `speedAll`). */
const HALF_SPEED_MODES = ["swim", "climb", "crawl"];

/** The skills and the ability each uses. */
export const SKILL_ABILITIES = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
};

/** How often an action can be used, as the form offers it (the values are the backend's). */
export const USAGE_TYPES = [
  { value: "", label: "No limit" },
  { value: "PER_DAY", label: "Times per day" },
  { value: "RECHARGE_ON_ROLL", label: "Recharge on a roll" },
  { value: "RECHARGE", label: "Recharges after a rest" },
];

/** What the usage number means for each usage type; the types not here have none. */
export const USAGE_PARAM_DEFAULTS = { PER_DAY: "1", RECHARGE_ON_ROLL: "5" };

/** The senses with a range, as the draft names them and the creature stores them. */
export const SENSES = [
  { key: "darkvision", field: "darkvisionRange", label: "Darkvision" },
  { key: "blindsight", field: "blindsightRange", label: "Blindsight" },
  { key: "tremorsense", field: "tremorsenseRange", label: "Tremorsense" },
  { key: "truesight", field: "truesightRange", label: "Truesight" },
];

/** The damage and condition lists a creature has, and what its stat block calls them. */
export const DEFENSES = [
  { field: "damageVulnerabilities", label: "Damage vulnerabilities", of: "damageTypes" },
  { field: "damageResistances", label: "Damage resistances", of: "damageTypes" },
  { field: "damageImmunities", label: "Damage immunities", of: "damageTypes" },
  { field: "conditionImmunities", label: "Condition immunities", of: "conditions" },
];

/** What a damage or condition list reads as by itself: "acid, cold" */
export function listText(items) {
  return items.map((item) => item.name.toLowerCase()).join(", ");
}

/**
 * A defense with different items. Its text follows the items unless it has been written by hand (the source text
 * often says more than the list, like "damage from nonmagical weapons").
 */
export function withDefenseItems(defense, items) {
  const followsItems = defense.display === listText(defense.items);
  return { items, display: followsItems ? listText(items) : defense.display };
}

export const ALIGNMENTS = [
  "lawful good",
  "neutral good",
  "chaotic good",
  "lawful neutral",
  "neutral",
  "chaotic neutral",
  "lawful evil",
  "neutral evil",
  "chaotic evil",
  "unaligned",
  "any alignment",
];

export const CHALLENGE_RATINGS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, index) => index + 1)];

const EXPERIENCE_BY_CHALLENGE_RATING = {
  0: 10,
  0.125: 25,
  0.25: 50,
  0.5: 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
};

let lastEntryId = 0;
const newEntryId = () => `entry-${++lastEntryId}`;

/** A trait for the form; `id` only tells entries apart while editing and is not saved. */
export function newTrait(trait = {}) {
  return { id: newEntryId(), name: trait.name ?? "", desc: trait.desc ?? "" };
}

/** An action for the form, of one of the backend's action types. */
export function newAction(actionType, action = {}) {
  return {
    id: newEntryId(),
    name: action.name ?? "",
    desc: action.desc ?? "",
    actionType,
    legendaryActionCost: action.legendaryActionCost ?? null,
    usageType: action.usageLimits?.type ?? "",
    usageParam: text(action.usageLimits?.param),
    limitedToForm: action.limitedToForm ?? "",
    // not edited here; kept so a duplicate keeps them
    attacks: action.attacks ?? [],
    crossreferences: action.crossreferences ?? { to: [] },
  };
}

/**
 * Moves the entry one place up (-1) or down (1) among the entries of its own group (`groupOf` names the group; by
 * default they are all one). Returns the same list if it can't move.
 */
export function moveEntry(entries, id, direction, groupOf = () => null) {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return entries;
  }
  let target = index + direction;
  while (target >= 0 && target < entries.length && groupOf(entries[target]) !== groupOf(entries[index])) {
    target += direction;
  }
  if (target < 0 || target >= entries.length) {
    return entries;
  }
  const moved = [...entries];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

/**
 * What the form edits. Numbers are strings, as typed, so a field can be empty.
 * `base` is the creature this started from, if any; `saveLevels` and `skillLevels` are 0 (not proficient), 1
 * (proficient) or 2 (expertise) per ability and skill.
 */
export function blankDraft() {
  return {
    base: null,
    name: "",
    size: null,
    type: null,
    alignment: "",
    challengeRating: 0,
    armorClass: "10",
    armorDetail: "",
    hitPoints: "",
    hitDice: "",
    speed: { walk: "30", fly: "", swim: "", climb: "", burrow: "", crawl: "", hover: false },
    abilityScores: Object.fromEntries(ABILITY_ORDER.map(([ability]) => [ability, "10"])),
    languages: "",
    saveLevels: {},
    skillLevels: {},
    senses: Object.fromEntries(SENSES.map(({ key }) => [key, ""])),
    defenses: Object.fromEntries(DEFENSES.map(({ field }) => [field, { items: [], display: "" }])),
    traits: [],
    actions: [],
  };
}

/** A draft that edits the creature as it is. */
export function draftFromCreature(creature) {
  const speed = creature.speed ?? creature.speedAll ?? {};
  const bonus = proficiencyBonusFor(creature) ?? 2;
  const scores = creature.abilityScores ?? {};
  const modifierOf = (ability) => creature.modifiers?.[ability] ?? abilityModifier(scores[ability] ?? 10);

  const saveLevels = {};
  for (const [ability] of ABILITY_ORDER) {
    saveLevels[ability] = levelOf(creature.savingThrows?.[ability], modifierOf(ability), bonus);
  }
  const skillLevels = {};
  for (const [skill, ability] of Object.entries(SKILL_ABILITIES)) {
    skillLevels[skill] = levelOf(creature.skillBonuses?.[skill], modifierOf(ability), bonus);
  }

  return {
    base: creature,
    name: creature.name ?? "",
    size: creature.size ?? null,
    type: creature.type ?? null,
    alignment: creature.alignment ?? "",
    challengeRating: creature.challengeRating ?? 0,
    armorClass: text(creature.armorClass),
    armorDetail: creature.armorDetail ?? "",
    hitPoints: text(creature.hitPoints),
    hitDice: creature.hitDice ?? "",
    speed: {
      ...Object.fromEntries(SPEED_MODES.map((mode) => [mode, speed[mode] ? String(speed[mode]) : ""])),
      hover: Boolean(creature.speedAll?.hover ?? speed.hover),
    },
    abilityScores: Object.fromEntries(ABILITY_ORDER.map(([ability]) => [ability, text(scores[ability] ?? 10)])),
    languages: creature.languages?.asString ?? "",
    saveLevels,
    skillLevels,
    senses: Object.fromEntries(SENSES.map(({ key, field }) => [key, text(creature[field])])),
    defenses: Object.fromEntries(
      DEFENSES.map(({ field }) => {
        const resistances = creature.resistancesAndImmunities ?? {};
        return [
          field,
          {
            items: (resistances[field] ?? []).map(({ key, name }) => ({ key, name })),
            display: resistances[`${field}Display`] ?? "",
          },
        ];
      }),
    ),
    traits: (creature.traits ?? []).map(newTrait),
    actions: ACTION_TYPES.flatMap(({ type }) => actionsOfType(creature, type)).map((action) =>
      newAction(action.actionType, action),
    ),
  };
}

/** The ability's modifier plus 0, 1 or 2 times the proficiency bonus, as a level. */
function levelOf(bonus, modifier, proficiencyBonus) {
  if (bonus === null || bonus === undefined) {
    return 0;
  }
  return Math.min(2, Math.max(0, Math.round((bonus - modifier) / proficiencyBonus)));
}

/** Whether the draft has what the backend needs to save it. */
export function draftProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the creature a name.");
  }
  if ([...draft.traits, ...draft.actions].some((entry) => !entry.name.trim())) {
    problems.push("Name each trait and action, or remove the empty ones.");
  }
  return problems;
}

/**
 * The creature JSON for a draft: what the backend takes to create or replace a creature, and what the stat block
 * shows as a preview.
 */
export function creatureFromDraft(draft) {
  const scores = Object.fromEntries(
    ABILITY_ORDER.map(([ability]) => [ability, toInteger(draft.abilityScores[ability]) ?? 10]),
  );
  const modifiers = Object.fromEntries(ABILITY_ORDER.map(([ability]) => [ability, abilityModifier(scores[ability])]));
  const challengeRating = Number(draft.challengeRating);
  const bonus = proficiencyBonusFor({ challengeRating });

  const savingThrowsAll = {};
  const savingThrows = {};
  for (const [ability] of ABILITY_ORDER) {
    const level = draft.saveLevels[ability] ?? 0;
    savingThrowsAll[ability] = modifiers[ability] + level * bonus;
    if (level > 0) {
      savingThrows[ability] = savingThrowsAll[ability];
    }
  }
  const skillBonusesAll = {};
  const skillBonuses = {};
  for (const [skill, ability] of Object.entries(SKILL_ABILITIES)) {
    const level = draft.skillLevels[skill] ?? 0;
    skillBonusesAll[skill] = modifiers[ability] + level * bonus;
    if (level > 0) {
      skillBonuses[skill] = skillBonusesAll[skill];
    }
  }

  // `speed` has the modes the creature has; `speedAll` also fills in the others the way the backend does: swimming,
  // climbing and crawling at half the walking speed, flying and burrowing not at all.
  const speedAll = { unit: "feet", hover: draft.speed.hover };
  const speed = { unit: "feet" };
  const walk = toInteger(draft.speed.walk) ?? 0;
  for (const mode of SPEED_MODES) {
    const feet = toInteger(draft.speed[mode]) ?? 0;
    speedAll[mode] = feet || (HALF_SPEED_MODES.includes(mode) ? Math.floor(walk / 2) : 0);
    if (feet > 0) {
      speed[mode] = feet;
    }
  }

  const base = draft.base;
  // Passive Perception is usually 10 + the Perception bonus, but not always (some sources differ); keep that offset.
  const passiveOffset =
    base?.passivePerception != null && base.skillBonusesAll?.perception != null
      ? base.passivePerception - 10 - base.skillBonusesAll.perception
      : 0;
  const languages = draft.languages.trim();
  const sameChallengeRating = base && base.challengeRating === challengeRating;

  return {
    category: "Monsters",
    normalSightRange: 10560, // a mile: what every creature in the backend has
    ...base,
    name: draft.name.trim(),
    size: draft.size,
    type: draft.type,
    alignment: draft.alignment.trim() || null,
    challengeRating,
    proficiencyBonus: bonus,
    experiencePoints: sameChallengeRating && base.experiencePoints != null
      ? base.experiencePoints
      : (EXPERIENCE_BY_CHALLENGE_RATING[challengeRating] ?? null),
    armorClass: toInteger(draft.armorClass),
    armorDetail: draft.armorDetail.trim(),
    hitPoints: toInteger(draft.hitPoints),
    hitDice: draft.hitDice.trim() || null,
    speed,
    speedAll,
    abilityScores: scores,
    modifiers,
    initiativeBonus: modifiers.dexterity,
    savingThrows,
    savingThrowsAll,
    skillBonuses,
    skillBonusesAll,
    passivePerception: 10 + skillBonusesAll.perception + passiveOffset,
    ...Object.fromEntries(SENSES.map(({ key, field }) => [field, toInteger(draft.senses[key])])),
    resistancesAndImmunities: {
      ...base?.resistancesAndImmunities,
      ...Object.fromEntries(
        DEFENSES.flatMap(({ field }) => [
          [field, draft.defenses[field].items],
          [`${field}Display`, draft.defenses[field].display.trim()],
        ]),
      ),
    },
    traits: draft.traits.filter(hasName).map(({ name, desc }) => ({ name: name.trim(), desc })),
    actions: actionsFromDraft(draft.actions),
    languages: {
      asString: languages,
      data: base?.languages?.asString === languages ? (base.languages.data ?? []) : [],
    },
  };
}

const hasName = (entry) => entry.name.trim() !== "";

/** The backend's actions: each type's in the form's order, numbered from 0 to give the stat block order. */
function actionsFromDraft(actions) {
  const countByType = {};
  return actions.filter(hasName).map((action) => {
    const order = (countByType[action.actionType] = (countByType[action.actionType] ?? -1) + 1);
    return {
      name: action.name.trim(),
      desc: action.desc,
      actionType: action.actionType,
      orderInStatblock: order,
      legendaryActionCost:
        action.actionType === "LEGENDARY_ACTION" ? (action.legendaryActionCost ?? 1) : action.legendaryActionCost,
      usageLimits: action.usageType
        ? { type: action.usageType, param: toInteger(action.usageParam) }
        : null,
      limitedToForm: action.limitedToForm.trim() || null,
      attacks: action.attacks,
      crossreferences: action.crossreferences,
    };
  });
}

function toInteger(value) {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? null : number;
}

function text(number) {
  return number === null || number === undefined ? "" : String(number);
}
