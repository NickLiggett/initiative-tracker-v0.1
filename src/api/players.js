import { apiGet, apiSend } from "./client";
import { announcePlayerChanged } from "./playerChanges";

/**
 * A "player" here is a character: the sheet a person plays. See the README.
 *
 * The characters the user made or plays, by name. Each has `id`, `name`, `ruleset` ("5e-2014" or "5e-2024"),
 * `classKey`/`className`, `speciesKey`/`speciesName`, `level`, `armorClass`, `hitPoints`, `initiativeBonus`, `notes`,
 * `owner`, `playedBy`, `role` ("OWNER", or "PLAYER" if the user only plays it), `vitals` (see `updateVitals`) and
 * `version`, which a save sends back so that one made from an out-of-date copy is refused.
 * @returns {Promise<object[]>}
 */
export function listPlayers({ signal } = {}) {
  return apiGet("/api/players", undefined, { signal });
}

/** One character the user made, plays or can see through their party. */
export function getPlayer(id, { signal } = {}) {
  return apiGet(`/api/players/${encodeURIComponent(id)}`, undefined, { signal });
}

/** Makes a character the user owns. `request` is as `listPlayers` gives, without the answer-only fields. */
export function createPlayer(request) {
  return apiSend("POST", "/api/players", request);
}

/**
 * Replaces a character. The owner can change anything; whoever only plays it can change its numbers and notes
 * (the rest must be sent as it is).
 */
export function updatePlayer(id, request) {
  return apiSend("PUT", `/api/players/${encodeURIComponent(id)}`, request).then((player) => {
    announcePlayerChanged(id);
    return player;
  });
}

/**
 * Changes what changes during play: any of `currentHp`, `tempHp`, `heroicInspiration`, `conditions`, `exhaustion`,
 * `deathSaveSuccesses` and `deathSaveFailures`; fields left out stay as they are. Anyone who can see the character can,
 * a DM seeing it through their party included. Resolves to the character.
 */
export function updateVitals(id, changes) {
  return apiSend("PATCH", `/api/players/${encodeURIComponent(id)}/vitals`, changes).then((player) => {
    announcePlayerChanged(id);
    return player;
  });
}

/**
 * Replaces the rest of a character's sheet (see features/sheet/sheetModel.js): `sheet` is a JSON object, and `version` the
 * character's `version` it was edited from, so that a save from an out-of-date copy is refused (409). The owner and whoever
 * plays the character can; a DM seeing it through their party can't. Resolves to the character.
 */
export function saveSheet(id, { version, sheet }) {
  return apiSend("PUT", `/api/players/${encodeURIComponent(id)}/sheet`, { version, sheet }).then((player) => {
    announcePlayerChanged(id);
    return player;
  });
}

/** Deletes a character. Owner only. */
export function deletePlayer(id) {
  return apiSend("DELETE", `/api/players/${encodeURIComponent(id)}`);
}

/**
 * What a character carries: `gold`, `silver`, `copper` and `items`, each `{itemKey, kind ("ITEM" or "MAGIC"), name,
 * quantity, equipped, attuned, notes}`; a line typed by hand has no `itemKey`. Anyone who can see the character can read it.
 */
export function getInventory(id, { signal } = {}) {
  return apiGet(`/api/players/${encodeURIComponent(id)}/inventory`, undefined, { signal });
}

/** Replaces what a character carries. Its owner and whoever plays it can; a DM seeing it through their party can't. */
export function saveInventory(id, inventory) {
  return apiSend("PUT", `/api/players/${encodeURIComponent(id)}/inventory`, inventory);
}
