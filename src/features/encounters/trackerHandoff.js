// Putting combatants into the initiative tracker from another page. The tracker is kept on the user's account (see
// useSavedTracker), and it loads from there when it opens, so adding to what is kept is enough.

import { getTracker, saveTracker } from "../../api/profile";
import { TRACKER_VERSION, nextCombatantId, toSavedState } from "../tracker/trackerState";

/**
 * Adds combatants after those already in the saved tracker, each with an id of its own.
 * @param {object[]} combatants as the tracker's own are, without ids
 * @returns {Promise<number>} how many were added
 */
export async function addToSavedTracker(combatants) {
  const state = await getTracker();
  const saved = state && typeof state === "object" ? state : {};
  const existing = Array.isArray(saved.combatants) ? saved.combatants : [];
  let id = nextCombatantId(existing.filter((combatant) => combatant && Number.isInteger(combatant.id)));
  const added = toSavedState(combatants.map((combatant) => ({ ...combatant, id: id++ }))).combatants;
  await saveTracker({ ...saved, version: TRACKER_VERSION, combatants: [...existing, ...added] });
  return added.length;
}
