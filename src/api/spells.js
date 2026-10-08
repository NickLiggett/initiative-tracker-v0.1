import { createResourceApi } from "./resource";

/** Spells, from Open5e's sources, the project's own, and the user's homebrew. */
export const spellsApi = createResourceApi("/api/spells");

/** One spell by key, e.g. "srd_fireball". */
export const getSpell = spellsApi.get;

/**
 * Spells whose name contains the text, sorted by name, narrowed by any of the filters:
 * - `level` 0 (cantrips) to 9
 * - `school` a spell school's key, e.g. "evocation"
 * - `classKeys` the keys of the class (or of the same-named classes in different rules, e.g. the 2014 and 2024 Wizard):
 *   a spell on the list of any of them. The backend takes one class at a time, so one request is made for each and the
 *   results joined
 * - `damageType` a damage type's key, e.g. "fire"
 * - `concentration` and `ritual`: true for only those that are; leave out for either
 *
 * @returns {Promise<object[]>} at most `pageSize`
 */
export async function searchSpells(name, { level, school, classKeys = [], damageType, concentration, ritual, pageSize = 25, signal } = {}) {
  const filters = { level, school, damageType, concentration, ritual, pageSize, signal };
  if (classKeys.length <= 1) {
    return spellsApi.search(name, { ...filters, class: classKeys[0] });
  }
  const lists = await Promise.all(classKeys.map((key) => spellsApi.search(name, { ...filters, class: key })));
  const byKey = new Map(lists.flat().map((spell) => [spell.key, spell]));
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key)).slice(0, pageSize);
}
