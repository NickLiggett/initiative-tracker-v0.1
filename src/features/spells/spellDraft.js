// The spell editor's form state, and turning it into what open5e-backend stores for a spell.
//
// A draft starts from an existing spell (when editing) and keeps everything the form doesn't show (how a spell scales
// with its slot, for instance). Numbers are kept as the text typed, so a field can be empty or half typed.

/** The casting times to offer, as the backend writes them. */
export const CASTING_TIMES = ["action", "bonus-action", "reaction", "1minute", "10minutes", "1hour", "8hours", "12hours", "24hours"];

export const DURATIONS = ["instantaneous", "1 round", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "7 days", "until dispelled", "special"];

export const TARGET_TYPES = ["creature", "object", "point", "area"];

export const SHAPES = ["sphere", "cube", "cone", "cylinder", "line"];

export const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];

/** A new spell: a 1st-level action spell that takes effect at once, until the form says otherwise. */
export function blankSpellDraft() {
  return {
    base: null,
    name: "",
    desc: "",
    higherLevel: "",
    level: "1",
    school: null,
    classes: [],
    ritual: false,
    concentration: false,
    castingTime: "action",
    reactionCondition: "",
    rangeText: "",
    rangeDistance: "",
    verbal: true,
    somatic: true,
    material: false,
    materialSpecified: "",
    materialCost: "",
    materialConsumed: false,
    duration: "instantaneous",
    targetType: "creature",
    targetCount: "",
    savingThrowAbility: "",
    attackRoll: false,
    damageRoll: "",
    damageTypes: [],
    shapeType: "",
    shapeSize: "",
  };
}

const text = (value) => (value === null || value === undefined ? "" : String(value));

export function draftFromSpell(spell) {
  return {
    base: spell,
    name: text(spell.name),
    desc: text(spell.desc),
    higherLevel: text(spell.higherLevel),
    level: text(spell.level ?? 1),
    school: spell.school ?? null,
    classes: spell.classes ?? [],
    ritual: Boolean(spell.ritual),
    concentration: Boolean(spell.concentration),
    castingTime: text(spell.castingTime),
    reactionCondition: text(spell.reactionCondition),
    rangeText: text(spell.rangeText),
    rangeDistance: spell.range > 0 ? text(spell.range) : "",
    verbal: Boolean(spell.verbal),
    somatic: Boolean(spell.somatic),
    material: Boolean(spell.material),
    materialSpecified: text(spell.materialSpecified),
    materialCost: spell.materialCost > 0 ? text(Number(spell.materialCost)) : "",
    materialConsumed: Boolean(spell.materialConsumed),
    duration: text(spell.duration),
    targetType: text(spell.targetType),
    targetCount: text(spell.targetCount),
    savingThrowAbility: text(spell.savingThrowAbility),
    attackRoll: Boolean(spell.attackRoll),
    damageRoll: text(spell.damageRoll),
    damageTypes: spell.damageTypes ?? [],
    shapeType: text(spell.shapeType),
    shapeSize: text(spell.shapeSize),
  };
}

/** A whole number from text, or null if it isn't one (nothing typed is null too). */
function whole(value) {
  return /^\d+$/.test(text(value).trim()) ? parseInt(value, 10) : null;
}

function problemWithWhole(label, value, { min = 0, max = Infinity } = {}) {
  if (text(value).trim() === "") {
    return null;
  }
  const number = whole(value);
  return number === null || number < min || number > max ? `${label} must be a whole number${max < Infinity ? ` from ${min} to ${max}` : min > 0 ? ` of ${min} or more` : ""}.` : null;
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function spellProblems(draft) {
  const level = whole(draft.level);
  return [
    draft.name.trim() ? null : "Give the spell a name.",
    level !== null && level <= 9 ? null : "Level must be 0 (a cantrip) to 9.",
    draft.school ? null : "Choose a school of magic.",
    draft.castingTime.trim() ? null : "Choose a casting time.",
    draft.duration.trim() ? null : "Say how long it lasts.",
    draft.desc.trim() ? null : "Describe what the spell does.",
    problemWithWhole("Range distance", draft.rangeDistance),
    problemWithWhole("Number of targets", draft.targetCount),
    draft.material && text(draft.materialCost).trim() !== "" && !/^\d+(\.\d+)?$/.test(draft.materialCost.trim())
      ? "Material cost must be a number of gold pieces."
      : null,
    draft.shapeType ? problemWithWhole("Area size", draft.shapeSize, { min: 1 }) : null,
  ].filter(Boolean);
}

/** The body to send the backend. Call it with a draft that has no problems (or for a preview). */
export function spellFromDraft(draft) {
  const { base } = draft;
  const rangeText = draft.rangeText.trim();
  const rangeDistance = whole(draft.rangeDistance);
  const rangeUnit = base?.rangeUnit ?? "feet";
  const level = whole(draft.level) ?? 1;

  return {
    ...base,
    name: draft.name.trim(),
    desc: draft.desc.trim(),
    higherLevel: draft.higherLevel.trim() || null,
    level,
    school: draft.school,
    classes: draft.classes,
    ritual: draft.ritual,
    concentration: draft.concentration,
    castingTime: draft.castingTime.trim(),
    reactionCondition: draft.castingTime === "reaction" ? draft.reactionCondition.trim() || null : null,
    // The words are what is shown; the distance is for sorting and comparing. "Self" and "Touch" have none.
    rangeText: rangeText || (rangeDistance ? `${rangeDistance} ${rangeUnit === "ft" ? "feet" : rangeUnit}` : null),
    range: rangeDistance ?? 0,
    rangeUnit,
    verbal: draft.verbal,
    somatic: draft.somatic,
    material: draft.material,
    materialSpecified: draft.material ? draft.materialSpecified.trim() || null : null,
    materialCost: draft.material && draft.materialCost.trim() ? Number(draft.materialCost) : null,
    materialConsumed: draft.material && draft.materialConsumed,
    duration: draft.duration.trim(),
    targetType: draft.targetType || null,
    targetCount: whole(draft.targetCount),
    savingThrowAbility: draft.savingThrowAbility,
    attackRoll: draft.attackRoll,
    damageRoll: draft.damageRoll.trim(),
    damageTypes: draft.damageTypes,
    shapeType: draft.shapeType || null,
    shapeSize: draft.shapeType ? whole(draft.shapeSize) : null,
    shapeSizeUnit: base?.shapeSizeUnit ?? "feet",
    castingOptions: base?.castingOptions ?? [],
  };
}
