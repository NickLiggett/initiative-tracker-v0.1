import { createResourceApi } from "./resource";

const creatures = createResourceApi("/api/creatures");

/**
 * Creatures whose name contains the text, sorted by name. The backend returns full stat blocks, so a result can be
 * used directly as a combatant's creature.
 * @returns {Promise<object[]>}
 */
export const searchCreatures = creatures.search;

/** One creature by key, e.g. "srd_adult-red-dragon". */
export const getCreature = creatures.get;

/** Saves a new creature in the signed-in user's homebrew document. Resolves to the saved creature. */
export const createCreature = creatures.create;

/** Replaces every field of one of the user's creatures. Resolves to the saved creature. */
export const replaceCreature = creatures.replace;

/**
 * Copies any creature into the user's homebrew document, remembering where it came from (`derivedFrom`).
 * Resolves to the copy.
 */
export const copyCreature = creatures.copy;

/** Deletes one of the user's creatures. */
export const deleteCreature = creatures.remove;
