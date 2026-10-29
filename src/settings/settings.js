// A user's look-and-feel settings: what they are, which are allowed, and the copy kept in this browser.
//
// The settings live on the user's account (see api/profile.js). The copy in the browser is a cache, one for each
// username: it lets the right colors show at once, before the backend has answered, and keeps changes that couldn't
// be sent. Only this file touches the browser's storage.

import { Pages } from "../constants/pages";
import { normalizeHex } from "./colors";
import {
  DEFAULT_NOTE_NAMES,
  DEFAULT_TRACKER_COLUMNS,
  sanitizeColumns,
  sanitizeNoteNames,
} from "../features/tracker/columnChoices";

export const DEFAULT_SETTINGS = {
  mode: "light",
  primary: "#1976d2",
  secondary: "#ab47bc", // MUI purple 400: clear enough to see against both the light and the dark page
  hpMode: "down", // how the initiative tracker counts hit points: "down" from the most, or "up" from none
  trackerColumns: DEFAULT_TRACKER_COLUMNS, // the columns the initiative tracker shows (see features/tracker/columnChoices.js)
  noteNames: DEFAULT_NOTE_NAMES, // what the tracker's three Notes columns are called; blank for the usual name
  font: "default", // the typeface of the whole site: one of FONTS
  textSize: "normal", // how big the text is: one of TEXT_SIZES
  favoritePages: [], // the drawer's pages pinned to the top of it, in the order pinned
  savedFilters: {}, // the filters saved by name for each page that has them: { spells: [{ name, filters }] }
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
export const CHOSEN = ["mode", "primary", "secondary", "hpMode", "trackerColumns", "noteNames", "savedFilters", "font", "textSize", "favoritePages"];

/** The typefaces to choose from. They are the ones every device has, so nothing is downloaded. `stack` is the CSS font-family. */
export const FONTS = [
  { value: "default", label: "Standard", stack: undefined },
  { value: "sans", label: "Clean", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { value: "serif", label: "Book", stack: 'Georgia, "Times New Roman", serif' },
  { value: "readable", label: "Easy to read", stack: 'Verdana, Tahoma, "Segoe UI", sans-serif' },
  { value: "mono", label: "Typewriter", stack: '"SFMono-Regular", Consolas, "Liberation Mono", monospace' },
];

/** How big the text can be; `size` is the base size in px (MUI's own is 14). */
export const TEXT_SIZES = [
  { value: "small", label: "Small", size: 12.5 },
  { value: "normal", label: "Normal", size: 14 },
  { value: "large", label: "Large", size: 16 },
  { value: "larger", label: "Larger", size: 18 },
];

const PAGE_NAMES = new Set(Object.values(Pages));

/** The pinned pages fit to use: only pages that exist, each once, in the order given. */
export function sanitizeFavoritePages(raw) {
  return Array.isArray(raw) ? [...new Set(raw.filter((page) => PAGE_NAMES.has(page)))] : [];
}

export const MAX_SAVED_FILTERS = 20; // for each page
export const MAX_SAVED_FILTER_NAME_LENGTH = 40;
const MAX_FILTER_PAGES = 12;

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Saved filters fit to use: each page's list has only named ones with filters, no more than are allowed. */
export function sanitizeSavedFilters(raw) {
  if (!isPlainObject(raw)) {
    return {};
  }
  const kept = {};
  for (const [page, list] of Object.entries(raw).slice(0, MAX_FILTER_PAGES)) {
    if (page && page.length <= 30 && Array.isArray(list)) {
      kept[page] = list
        .filter((one) => isPlainObject(one) && typeof one.name === "string" && one.name.trim() && isPlainObject(one.filters))
        .map((one) => ({ name: one.name.trim().slice(0, MAX_SAVED_FILTER_NAME_LENGTH), filters: one.filters }))
        .slice(0, MAX_SAVED_FILTERS);
    }
  }
  return kept;
}

/** Whether a setting is as it was: some are lists, so this compares what they say, not which list it is. */
export const sameSetting = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Whether the colors, mode and the rest of what is chosen are the defaults. */
export function isDefaultLook(settings) {
  return CHOSEN.every((name) => sameSetting(settings[name], DEFAULT_SETTINGS[name]));
}

/** Settings fit to use: anything missing or not allowed is replaced by the default. */
export function sanitizeSettings(raw) {
  const settings = raw && typeof raw === "object" ? raw : {};
  const version = settings.avatarVersion;
  return {
    mode: MODES.some(({ value }) => value === settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,
    primary: normalizeHex(settings.primary) ?? DEFAULT_SETTINGS.primary,
    secondary: normalizeHex(settings.secondary) ?? DEFAULT_SETTINGS.secondary,
    hpMode: settings.hpMode === "up" ? "up" : DEFAULT_SETTINGS.hpMode,
    trackerColumns: sanitizeColumns(settings.trackerColumns),
    noteNames: sanitizeNoteNames(settings.noteNames),
    savedFilters: sanitizeSavedFilters(settings.savedFilters),
    font: FONTS.some(({ value }) => value === settings.font) ? settings.font : DEFAULT_SETTINGS.font,
    textSize: TEXT_SIZES.some(({ value }) => value === settings.textSize) ? settings.textSize : DEFAULT_SETTINGS.textSize,
    favoritePages: sanitizeFavoritePages(settings.favoritePages),
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
