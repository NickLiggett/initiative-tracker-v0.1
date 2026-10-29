import { createResourceApi } from "./resource";

/** Spells, from Open5e's sources, the project's own, and the user's homebrew. */
export const spellsApi = createResourceApi("/api/spells");

/** One spell by key, e.g. "srd_fireball". */
export const getSpell = spellsApi.get;

/**
 * What the backend is asked for a set of filters (see `searchSpells`): the class keys go as one comma-separated list.
 * @returns {object} query parameters
 */
export function spellQuery({ level, school, classKeys = [], damageType, concentration, ritual, document } = {}) {
  return { document, level, school, class: classKeys.length ? classKeys.join(",") : undefined, damageType, concentration, ritual };
}

/**
 * One page of the spells matching the filters (the same as `searchSpells` takes, and a `name`), with where it is in the
 * whole list. See `createResourceApi` for the paging and `sort`.
 */
export function listSpells({ name, ...rest }) {
  const { signal, page, pageSize, sort, ...filters } = rest;
  return spellsApi.list({ name, ...spellQuery(filters), page, pageSize, sort, signal });
}

/**
 * Spells whose name contains the text, sorted by name, narrowed by any of the filters:
 * - `level` 0 (cantrips) to 9
 * - `school` a spell school's key, e.g. "evocation"
 * - `classKeys` the keys of the class (or of the same-named classes in different rules, e.g. the 2014 and 2024 Wizard):
 *   a spell on the list of any of them
 * - `damageType` a damage type's key, e.g. "fire"
 * - `concentration` and `ritual`: true for only those that are; leave out for either
 *
 * @returns {Promise<object[]>} at most `pageSize`
 */
export function searchSpells(name, { pageSize = 25, signal, ...filters } = {}) {
  return spellsApi.search(name, { ...spellQuery(filters), pageSize, signal });
}
