// The initiative order as plain data. Every function returns a new array and never changes its input, so React
// state updates stay predictable.

import { MAX_NOTE_LENGTH, NOTE_FIELDS } from "./columnChoices";

/**
 * The new HP after an edit: "+5" heals 5, "-7" deals 7 damage, anything else sets HP to that number.
 * @returns {number} NaN if the input isn't a number
 */
export function applyHpInput(currentHp, input) {
  const text = String(input).trim();
  const current = parseInt(currentHp, 10) || 0;
  if (text.startsWith("+")) {
    return current + parseInt(text.slice(1), 10);
  }
  if (text.startsWith("-")) {
    return current - parseInt(text.slice(1), 10);
  }
  return parseInt(text, 10);
}

/** Whether HP is counted down from the most (the default) or up from none: how the tracker's HP column is shown and typed. */
export const HP_MODES = ["down", "up"];

const hasMaxHp = (combatant) => Number.isFinite(combatant.maxHp) && Number.isFinite(combatant.hp);

/**
 * The number the HP column shows and takes edits to: the hit points left, or when counting up (and the most is known)
 * the damage taken. Typing "+5" or "-7" changes that number, whichever way it is counted.
 */
export function shownHp(combatant, mode = "down") {
  return mode === "up" && hasMaxHp(combatant) ? combatant.maxHp - combatant.hp : combatant.hp;
}

/** The hit points left that the number the column shows stands for (the opposite of `shownHp`). */
export function hpFromShown(combatant, shown, mode = "down") {
  return mode === "up" && hasMaxHp(combatant) ? combatant.maxHp - shown : shown;
}

/** What the HP column says: "3/20" when the most is known, otherwise just the number. */
export function formatHp(combatant, mode = "down") {
  const shown = shownHp(combatant, mode);
  return Number.isFinite(combatant.maxHp) && shown !== "" && shown != null ? `${shown}/${combatant.maxHp}` : shown;
}

/** Whether the most hit points of the row are known: without them there is no damage taken to show. */
export const knowsMaxHp = hasMaxHp;

/** The damage a row has taken, or "" when its most hit points aren't known. */
export const damageTaken = (combatant) => (hasMaxHp(combatant) ? combatant.maxHp - combatant.hp : "");

/**
 * What typing `input` in a cell that shows the hit points (see `shownHp`) does to a row. Damage, which is "-7" counting
 * down or "+7" counting up (or in the damage taken column), uses up the row's temporary hit points before its own, as
 * the rules say; a number typed to set it, or healing, leaves the temporary hit points alone.
 * @returns {object} `hp`, and `tempHp` when some was used up; empty if the input isn't a number
 */
function hitPointChanges(row, input, mode) {
  const text = String(input).trim();
  const hp = hpFromShown(row, applyHpInput(shownHp(row, mode), text), mode);
  if (Number.isNaN(hp)) {
    return {};
  }
  const sign = mode === "up" ? "+" : "-";
  const damage = Number.isFinite(row.hp) ? row.hp - hp : 0;
  if (!text.startsWith(sign) || damage <= 0 || !(row.tempHp > 0)) {
    return { hp };
  }
  const absorbed = Math.min(row.tempHp, damage);
  return { hp: hp + absorbed, tempHp: row.tempHp - absorbed };
}

const NUMBER_FIELDS = ["initiative", "ac", "tempHp"];
const TEXT_FIELDS = ["name", ...NOTE_FIELDS];

/**
 * What an edit in the grid changes on a combatant. `newRow` is the row as the grid has it after the edit: the typed text
 * is in the field's place, and for hit points in `hpInput`, or for the damage taken column in `damageInput` (see the
 * grid's columns). Text that isn't a number leaves the old value; hit points take "+5" and "-7" on the number shown
 * (see `shownHp`), and damage uses up temporary hit points first.
 * @returns {object} just the fields that changed
 */
export function editedFields(newRow, oldRow, mode = "down") {
  const changes = {};
  for (const field of NUMBER_FIELDS) {
    if (newRow[field] === oldRow[field]) {
      continue;
    }
    const value = field === "tempHp" && newRow[field] === "" ? 0 : parseInt(newRow[field], 10);
    if (!Number.isNaN(value)) {
      changes[field] = field === "tempHp" ? Math.max(0, value) : value;
    }
  }
  for (const field of TEXT_FIELDS) {
    if (newRow[field] !== oldRow[field] && !(newRow[field] === "" && oldRow[field] === undefined)) {
      changes[field] = String(newRow[field] ?? "").slice(0, field === "name" ? Infinity : MAX_NOTE_LENGTH);
    }
  }
  if (newRow.hpInput !== undefined) {
    Object.assign(changes, hitPointChanges(oldRow, newRow.hpInput, mode));
  }
  if (newRow.damageInput !== undefined && hasMaxHp(oldRow)) {
    Object.assign(changes, hitPointChanges(oldRow, newRow.damageInput, "up"));
  }
  return changes;
}

/** Replaces the combatant with the same id. */
export function updateCombatant(combatants, id, changes) {
  return combatants.map((combatant) => (combatant.id === id ? { ...combatant, ...changes } : combatant));
}

export function removeCombatant(combatants, id) {
  return combatants.filter((combatant) => combatant.id !== id);
}

/** A character's armor class and hit points are the table's to see; anything else is hidden from players until revealed. */
export const isCharacter = (combatant) => combatant.playerId != null || combatant.type === "PC";

/** What the DM can hide from the players about a monster or other row that isn't a character. */
export const HIDEABLE = ["name", "ac", "hp"];

/**
 * Whether the players see this field of the row. Characters' are always shown. Rows kept before AC and HP could be
 * shown on their own have one `revealed` for both, which stands for them until they are set separately.
 */
export function fieldShown(combatant, field) {
  if (isCharacter(combatant)) {
    return true;
  }
  if (field === "name") {
    return !combatant.nameHidden;
  }
  return combatant[`${field}Revealed`] ?? Boolean(combatant.revealed);
}

/** What to change on a row to show or hide one of its fields from the players. */
export const fieldShownChange = (field, shown) => (field === "name" ? { nameHidden: !shown } : { [`${field}Revealed`]: shown });

/** Shows or hides one field of every row that isn't a character. */
export function setFieldShownForAll(combatants, field, shown) {
  return combatants.map((combatant) => (isCharacter(combatant) ? combatant : { ...combatant, ...fieldShownChange(field, shown) }));
}

/** Whether the players see this field of every row that isn't a character (false if there are none). */
export function allFieldShown(combatants, field) {
  const hideable = combatants.filter((combatant) => !isCharacter(combatant));
  return hideable.length > 0 && hideable.every((combatant) => fieldShown(combatant, field));
}

/** Shows or hides the AC and HP of everything that can be hidden from the players: the monsters and others, not the characters. */
export function setAllRevealed(combatants, revealed) {
  return setFieldShownForAll(setFieldShownForAll(combatants, "ac", revealed), "hp", revealed).map((combatant) =>
    isCharacter(combatant) ? combatant : { ...combatant, revealed },
  );
}

/** Highest initiative first. */
export function sortByInitiative(combatants) {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

/** Moves the current combatant to the end; the next one's reaction becomes available again. */
export function nextTurn(combatants) {
  if (combatants.length === 0) {
    return combatants;
  }
  const [current, ...rest] = combatants;
  const rotated = [...rest, current];
  return [{ ...rotated[0], reaction: false }, ...rotated.slice(1)];
}

/** Moves the last combatant back to the front. */
export function previousTurn(combatants) {
  if (combatants.length === 0) {
    return combatants;
  }
  return [combatants[combatants.length - 1], ...combatants.slice(0, -1)];
}
