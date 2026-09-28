import { apiGet } from "./client";

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
