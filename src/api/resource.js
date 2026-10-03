import { apiGet, apiSend } from "./client";

/**
 * The calls every kind of content shares (creatures, items, ...), for one collection of the backend.
 * @param {string} path e.g. "/api/creatures"
 */
export function createResourceApi(path) {
  const at = (key) => `${path}/${encodeURIComponent(key)}`;

  return {
    /**
     * Those whose name contains the text, sorted by name; `filters` are further query parameters.
     * @returns {Promise<object[]>}
     */
    async search(name, { pageSize = 25, signal, ...filters } = {}) {
      const page = await apiGet(path, { name, pageSize, sort: "name", ...filters }, { signal });
      return page.content;
    },

    /** One by key, e.g. "srd_adult-red-dragon". */
    get(key, { signal } = {}) {
      return apiGet(at(key), undefined, { signal });
    },

    /** Saves a new one in the signed-in user's homebrew document. Resolves to the saved one. */
    create(body) {
      return apiSend("POST", path, body);
    },

    /** Replaces every field of one of the user's. Resolves to the saved one. */
    replace(key, body) {
      return apiSend("PUT", at(key), body);
    },

    /** Copies any into the user's homebrew document, remembering where it came from (`derivedFrom`). */
    copy(key) {
      return apiSend("POST", `${at(key)}/copy`, {});
    },

    /** Deletes one of the user's. */
    remove(key) {
      return apiSend("DELETE", at(key));
    },
  };
}
