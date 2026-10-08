import { createResourceApi } from "./resource";

/** Species and subspecies, from Open5e's sources, the project's own, and the user's homebrew. */
export const speciesApi = createResourceApi("/api/species");

/**
 * Species whose name contains the text, sorted by name. Filters, as further query parameters: `isSubspecies` (true or
 * false) and `subspeciesOf` (a species key, to list that species' subspecies).
 * @returns {Promise<object[]>}
 */
export const searchSpecies = speciesApi.search;

/** One species by key, e.g. "srd_dwarf". */
export const getSpecies = speciesApi.get;
