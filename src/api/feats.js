import { createResourceApi } from "./resource";

/** Feats, from Open5e's sources, the project's own, and the user's homebrew. */
export const featsApi = createResourceApi("/api/feats");

/** One feat by key, e.g. "srd-2024_alert". */
export const getFeat = featsApi.get;

/**
 * Feats whose name contains the text, sorted by name, narrowed by any of the filters:
 * - `type` a feat type such as "General", "Origin", "Fighting Style" or "Epic Boon"; the backend ignores its case, which
 *   the sources write both ways ("General", "GENERAL")
 * - `hasPrerequisite`: true for only those that have one; leave out for either
 *
 * @returns {Promise<object[]>} at most `pageSize`
 */
export function searchFeats(name, { type, hasPrerequisite, document, pageSize = 25, signal } = {}) {
  return featsApi.search(name, { type, hasPrerequisite, document, pageSize, signal });
}

/** One page of the feats matching the filters (the same as `searchFeats` takes, and a `name`); see `createResourceApi`. */
export function listFeats({ name, type, hasPrerequisite, document, page, pageSize, sort, signal }) {
  return featsApi.list({ name, type, hasPrerequisite, document, page, pageSize, sort, signal });
}
