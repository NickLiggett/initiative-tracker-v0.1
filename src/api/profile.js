import { apiGet, apiSend, buildUrl } from "./client";

// What belongs to the signed-in user rather than to any document: their settings, avatar picture and tracker state.

/**
 * The user's settings as far as they've chosen any (`mode`, `primary`, `secondary`), and `avatarVersion`: the version
 * of their avatar picture, or null if they have none.
 */
export function getSettings({ signal } = {}) {
  return apiGet("/api/me/settings", undefined, { signal });
}

/** Replaces the user's settings (`mode`, `primary`, `secondary`). Resolves to what was kept. */
export function saveSettings(settings) {
  const { mode, primary, secondary } = settings;
  return apiSend("PUT", "/api/me/settings", { mode, primary, secondary });
}

/** The state the user left their tracker in: an object, empty if they've never saved one. */
export function getTracker({ signal } = {}) {
  return apiGet("/api/me/tracker", undefined, { signal });
}

/** Keeps the state of the user's tracker (any JSON object up to 256 KB). */
export function saveTracker(state) {
  return apiSend("PUT", "/api/me/tracker", state);
}

/**
 * Makes the picture the user's avatar. It is sent as it is, so its type must be PNG, JPEG, WebP or GIF.
 * @param {Blob} picture
 * @returns {Promise<{avatarVersion: number}>}
 */
export function uploadAvatar(picture) {
  return apiSend("PUT", "/api/me/avatar", picture);
}

export function deleteAvatar() {
  return apiSend("DELETE", "/api/me/avatar");
}

/**
 * Where a user's avatar picture is. Anyone's can be shown by username; a version (from `getSettings`, for the
 * signed-in user) makes the browser fetch a new picture at once rather than check.
 */
export function avatarUrl(username, version) {
  return buildUrl(`/api/users/${encodeURIComponent(username)}/avatar`, { v: version ?? undefined });
}
