import { createResourceApi } from "./resource";

/** Classes and subclasses, from Open5e's sources, the project's own, and the user's homebrew. */
export const classesApi = createResourceApi("/api/classes");

/**
 * Classes whose name contains the text, sorted by name. Filters, as further query parameters: `subclass` (true for only
 * subclasses, false for only classes) and `subclassOf` (a class's key, to list that class's subclasses).
 * @returns {Promise<object[]>}
 */
export const searchClasses = classesApi.search;

/** One class by key, e.g. "srd_wizard". */
export const getClass = classesApi.get;
