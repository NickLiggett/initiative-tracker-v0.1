import { apiGet, apiSend } from "./client";

/**
 * Creatures whose name contains the text, sorted by name. The backend returns full stat blocks, so a result can be
 * used directly as a combatant's creature.
 * @returns {Promise<object[]>}
 */
export async function searchCreatures(name, { pageSize = 25, signal } = {}) {
  const page = await apiGet("/api/creatures", { name, pageSize, sort: "name" }, { signal });
  return page.content;
}

/** One creature by key, e.g. "srd_adult-red-dragon". */
export function getCreature(key, { signal } = {}) {
  return apiGet(`/api/creatures/${encodeURIComponent(key)}`, undefined, { signal });
}

/** Saves a new creature in the signed-in user's homebrew document. Resolves to the saved creature. */
export function createCreature(creature) {
  return apiSend("POST", "/api/creatures", creature);
}

/** Replaces every field of one of the user's creatures. Resolves to the saved creature. */
export function replaceCreature(key, creature) {
  return apiSend("PUT", `/api/creatures/${encodeURIComponent(key)}`, creature);
}

/**
 * Copies any creature into the user's homebrew document, remembering where it came from (`derivedFrom`).
 * Resolves to the copy.
 */
export function copyCreature(key) {
  return apiSend("POST", `/api/creatures/${encodeURIComponent(key)}/copy`, {});
}

/** Deletes one of the user's creatures. */
export function deleteCreature(key) {
  return apiSend("DELETE", `/api/creatures/${encodeURIComponent(key)}`);
}
