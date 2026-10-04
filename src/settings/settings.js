// A user's look-and-feel settings: what they are, which are allowed, and the copy kept in this browser.
//
// The settings live on the user's account (see api/profile.js). The copy in the browser is a cache, one for each
// username: it lets the right colors show at once, before the backend has answered, and keeps changes that couldn't
// be sent. Only this file touches the browser's storage.

import { normalizeHex } from "./colors";

export const DEFAULT_SETTINGS = {
  mode: "light",
  primary: "#1976d2",
  secondary: "#ab47bc", // MUI purple 400: clear enough to see against both the light and the dark page
  avatarVersion: null, // when the avatar picture on the account was saved; null for none
};

export const MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my device" },
];

/** Pairs of colors that go well together, to pick from. */
export const COLOR_PRESETS = [
  { name: "Default", primary: "#1976d2", secondary: "#ab47bc" },
  { name: "Forest", primary: "#2e7d32", secondary: "#8d6e63" },
  { name: "Ember", primary: "#d84315", secondary: "#f9a825" },
  { name: "Royal", primary: "#5e35b1", secondary: "#00acc1" },
  { name: "Slate", primary: "#455a64", secondary: "#ff7043" },
  { name: "Rose", primary: "#c2185b", secondary: "#00897b" },
];

/** The settings that are kept as chosen, as opposed to `avatarVersion`, which the account works out. */
export const CHOSEN = ["mode", "primary", "secondary"];

/** Whether the colors and mode are the defaults. */
export function isDefaultLook(settings) {
  return CHOSEN.every((name) => settings[name] === DEFAULT_SETTINGS[name]);
}

/** Settings fit to use: anything missing or not allowed is replaced by the default. */
export function sanitizeSettings(raw) {
  const settings = raw && typeof raw === "object" ? raw : {};
  const version = settings.avatarVersion;
  return {
    mode: MODES.some(({ value }) => value === settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,
    primary: normalizeHex(settings.primary) ?? DEFAULT_SETTINGS.primary,
    secondary: normalizeHex(settings.secondary) ?? DEFAULT_SETTINGS.secondary,
    avatarVersion: Number.isFinite(version) && version >= 0 ? Math.trunc(version) : null,
  };
}

const KEY_PREFIX = "initiative-tracker.settings.";
const LAST_USER_KEY = "initiative-tracker.last-user";
const GUEST = "guest";

/** Reads from the browser's storage; null if it can't (turned off, or nothing there). */
function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The settings this browser has kept for this username, or the defaults. */
export function loadCachedSettings(username) {
  try {
    return sanitizeSettings(JSON.parse(read(KEY_PREFIX + (username || GUEST))));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Keeps the settings for this username in this browser. Returns false if the browser wouldn't. */
export function cacheSettings(username, settings) {
  try {
    window.localStorage.setItem(KEY_PREFIX + (username || GUEST), JSON.stringify(sanitizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/**
 * An earlier version kept the avatar picture here, in this browser, as a data URL, before pictures lived on the
 * account. This is that picture if the browser still has it (null if not), so it can be moved to the account.
 */
export function legacyAvatar(username) {
  try {
    const avatar = JSON.parse(read(KEY_PREFIX + (username || GUEST)))?.avatar;
    return typeof avatar === "string" && avatar.startsWith("data:image/") ? avatar : null;
  } catch {
    return null;
  }
}

/** A picture written as a data URL, as a Blob again. Null if it isn't one. */
export function dataUrlToBlob(dataUrl) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(dataUrl ?? "");
  if (!match) {
    return null;
  }
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1].toLowerCase() });
}

/** Who was signed in last, so their settings can be used before the backend has said who is signed in. */
export function lastUser() {
  return read(LAST_USER_KEY);
}

export function rememberUser(username) {
  try {
    window.localStorage.setItem(LAST_USER_KEY, username);
  } catch {
    // nothing to do: the settings just load a moment later
  }
}
