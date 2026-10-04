// A user's look-and-feel settings: what they are, which are allowed, and where they are kept.
//
// They are kept in the browser, one set for each username, so two people using one browser don't share them. Only
// this file touches the storage, so keeping them on the server instead later would be a change here.

import { normalizeHex } from "./colors";

/** The most characters an avatar picture can take as a data URL, to stay well inside the browser's storage. */
export const MAX_AVATAR_CHARS = 400_000;

export const DEFAULT_SETTINGS = {
  mode: "light",
  primary: "#1976d2",
  secondary: "#ab47bc", // MUI purple 400: clear enough to see against both the light and the dark page
  avatar: null,
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

/** Settings fit to use: anything missing or not allowed is replaced by the default. */
export function sanitizeSettings(raw) {
  const settings = raw && typeof raw === "object" ? raw : {};
  const avatar = settings.avatar;
  return {
    mode: MODES.some(({ value }) => value === settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,
    primary: normalizeHex(settings.primary) ?? DEFAULT_SETTINGS.primary,
    secondary: normalizeHex(settings.secondary) ?? DEFAULT_SETTINGS.secondary,
    avatar:
      typeof avatar === "string" && avatar.startsWith("data:image/") && avatar.length <= MAX_AVATAR_CHARS ? avatar : null,
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

/** The settings kept for this username, or the defaults. */
export function loadSettings(username) {
  try {
    return sanitizeSettings(JSON.parse(read(KEY_PREFIX + (username || GUEST))));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Keeps the settings for this username. Returns false if the browser wouldn't (its storage is full or turned off). */
export function saveSettings(username, settings) {
  try {
    window.localStorage.setItem(KEY_PREFIX + (username || GUEST), JSON.stringify(sanitizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** Who was signed in here last, so their settings can be used before the backend has said who is signed in. */
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
