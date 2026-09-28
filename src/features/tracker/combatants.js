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

/** Replaces the combatant with the same id. */
export function updateCombatant(combatants, id, changes) {
  return combatants.map((combatant) => (combatant.id === id ? { ...combatant, ...changes } : combatant));
}

export function removeCombatant(combatants, id) {
  return combatants.filter((combatant) => combatant.id !== id);
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
