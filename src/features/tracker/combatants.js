// The initiative order as plain data. Every function returns a new array and never changes its input, so React
// state updates stay predictable.

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

const EDITED_IN_GRID = ["initiative", "name", "ac"];

/**
 * What an edit in the grid changes on a combatant. `newRow` is the row as the grid has it after the edit: the typed text
 * is in the field's place, and for HP in `hpInput` (see the grid's HP column). Text that isn't a number leaves the old
 * value; HP takes "+5" and "-7" on the number shown (see `shownHp`).
 * @returns {object} just the fields that changed
 */
export function editedFields(newRow, oldRow, mode = "down") {
  const changes = {};
  for (const field of EDITED_IN_GRID) {
    if (newRow[field] === oldRow[field]) {
      continue;
    }
    const value = field === "name" ? String(newRow[field]) : parseInt(newRow[field], 10);
    if (!Number.isNaN(value)) {
      changes[field] = value;
    }
  }
  if (newRow.hpInput !== undefined) {
    const hp = hpFromShown(oldRow, applyHpInput(shownHp(oldRow, mode), newRow.hpInput), mode);
    if (!Number.isNaN(hp)) {
      changes.hp = hp;
    }
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

/** Shows or hides everything that can be hidden from the players: the monsters and others, not the characters. */
export function setAllRevealed(combatants, revealed) {
  return combatants.map((combatant) => (isCharacter(combatant) ? combatant : { ...combatant, revealed }));
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
