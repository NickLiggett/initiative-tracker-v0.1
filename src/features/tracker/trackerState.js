// The initiative tracker as it is kept on the user's account, and back again.
//
// A combatant made from a creature carries the creature's whole stat block, which can be tens of kilobytes. What is
// kept is its key; the stat block is looked up again when the tracker is loaded, so the saved state stays small and
// shows the creature as it is now.

export const TRACKER_VERSION = 1;

/** The state to keep for these combatants. */
export function toSavedState(combatants) {
  return {
    version: TRACKER_VERSION,
    combatants: combatants.map(({ creature, creatureKey, ...combatant }) => ({
      ...combatant,
      creatureKey: creature?.key ?? creatureKey ?? null, // a creature that couldn't be loaded is still remembered
    })),
  };
}

/** The keys of the creatures a saved state needs, each once. */
export function creatureKeys(state) {
  const saved = Array.isArray(state?.combatants) ? state.combatants : [];
  const keys = saved.map((combatant) => combatant?.creatureKey).filter((key) => typeof key === "string" && key);
  return [...new Set(keys)];
}

/**
 * The combatants a saved state describes, with their creatures put back from `creatures` (by key). A combatant whose
 * creature isn't there still comes back, without it but still knowing which it was (`creatureKey`), so that saving
 * again doesn't forget it and loading later can find it. Entries that aren't combatants are left out.
 * @param {object} state what `toSavedState` made, or anything at all
 * @param {Record<string, object>} creatures the stat blocks found, by key
 */
export function fromSavedState(state, creatures) {
  const saved = Array.isArray(state?.combatants) ? state.combatants : [];
  return saved
    .filter((combatant) => combatant && typeof combatant === "object" && Number.isInteger(combatant.id))
    .map(({ creatureKey, ...combatant }) => {
      const creature = (creatureKey && creatures[creatureKey]) || null;
      return { ...combatant, creature, ...(creatureKey && !creature && { creatureKey }) };
    });
}

/** The id for the next combatant added: one more than the highest so far. */
export function nextCombatantId(combatants) {
  return combatants.reduce((highest, combatant) => Math.max(highest, combatant.id), 0) + 1;
}
