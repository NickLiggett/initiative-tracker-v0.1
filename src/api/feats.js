import { createResourceApi } from "./resource";

/** Feats, from Open5e's sources, the project's own, and the user's homebrew. */
export const featsApi = createResourceApi("/api/feats");

/** One feat by key, e.g. "srd-2024_alert". */
export const getFeat = featsApi.get;

/**
 * The ways a feat's type is spelled in the data: Open5e's sources write "GENERAL" in some places and "General" in
 * others, and the backend matches a type exactly.
 */
export function typeSpellings(type) {
  return [...new Set([type, type.toUpperCase()])];
}

/**
 * Feats whose name contains the text, sorted by name, narrowed by any of the filters:
 * - `type` a feat type such as "General", "Origin", "Fighting Style" or "Epic Boon", however it is capitalized
 * - `hasPrerequisite`: true for only those that have one; leave out for either
 *
 * The backend takes one spelling of a type at a time, so one request is made for each and the results joined.
 *
 * @returns {Promise<object[]>} at most `pageSize`
 */
export async function searchFeats(name, { type, hasPrerequisite, pageSize = 25, signal } = {}) {
  const filters = { hasPrerequisite, pageSize, signal };
  if (!type) {
    return featsApi.search(name, filters);
  }
  const lists = await Promise.all(typeSpellings(type).map((spelling) => featsApi.search(name, { ...filters, type: spelling })));
  const byKey = new Map(lists.flat().map((feat) => [feat.key, feat]));
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key)).slice(0, pageSize);
}
