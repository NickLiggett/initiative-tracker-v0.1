// Showing a class, as plain functions.

const CASTERS = { FULL: "Full caster", HALF: "Half caster", THIRD: "Third caster", PACT: "Pact magic", NONE: "Not a spellcaster" };

/** What kind of spellcaster a class is ("Full caster"), or "" when the source doesn't say. */
export function casterLabel(casterType) {
  return CASTERS[casterType] ?? "";
}

/** "D10" is "d10"; the class's hit die as the source gives it, from its hit points when it has them. */
export function hitDie(cls) {
  const die = cls.hitPoints?.hitDice ?? cls.hitDice;
  return die ? die.toLowerCase() : "";
}

/** "Intelligence, Wisdom" */
export function names(references) {
  return (references ?? []).map((reference) => reference.name).filter(Boolean).join(", ");
}

/** "Subclass of Wizard · 5e 2014 Rules": what to say under a result's name. */
export function describeResult(cls) {
  return [cls.subclassOf ? `Subclass of ${cls.subclassOf.name}` : "Class", cls.document?.displayName ?? cls.document?.name]
    .filter(Boolean)
    .join(" · ");
}

/** "Level 5", "Levels 4, 8 and 12", or "" for a feature gained at no level. */
export function levelsText(levels) {
  if (levels.length === 0) {
    return "";
  }
  if (levels.length === 1) {
    return `Level ${levels[0]}`;
  }
  return `Levels ${levels.slice(0, -1).join(", ")} and ${levels.at(-1)}`;
}
