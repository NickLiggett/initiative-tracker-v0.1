// Where a character's sheet lives: the app's own address with ?sheet=ID, which opens straight onto it in a tab of its
// own (the app has no router, so this is the one address that means anything).

/** The id of the character the address asks for, or null if it asks for none. `search` is `location.search`. */
export function sheetIdFromSearch(search) {
  const id = new URLSearchParams(search).get("sheet");
  return /^\d+$/.test(id ?? "") ? Number(id) : null;
}

/** The address of a character's sheet. */
export function sheetUrl(id, { origin = window.location.origin, pathname = window.location.pathname } = {}) {
  return `${origin}${pathname}?sheet=${encodeURIComponent(id)}`;
}

/**
 * Opens a character's sheet in a new tab. It is opened without `noopener` on purpose: the tab then starts with a copy of
 * this one's sign-in, so it opens signed in.
 */
export function openSheet(id, open = window.open.bind(window)) {
  return open(sheetUrl(id), "_blank");
}
