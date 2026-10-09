import { createResourceApi } from "./resource";

/** Backgrounds, from Open5e's sources, the project's own, and the user's homebrew. */
export const backgroundsApi = createResourceApi("/api/backgrounds");

/** Backgrounds whose name contains the text, sorted by name. */
export const searchBackgrounds = backgroundsApi.search;

/** One background by key, e.g. "srd_acolyte". */
export const getBackground = backgroundsApi.get;
