import { apiGet, apiSend } from "./client";

/**
 * The player characters the user made or plays, by name. Each has `id`, `name`, `ruleset` ("5e-2014" or "5e-2024"),
 * `classKey`/`className`, `speciesKey`/`speciesName`, `level`, `armorClass`, `hitPoints`, `initiativeBonus`, `notes`,
 * `owner`, `playedBy` and `role` ("OWNER", or "PLAYER" if the user only plays it).
 * @returns {Promise<object[]>}
 */
export function listPlayers({ signal } = {}) {
  return apiGet("/api/players", undefined, { signal });
}

/** One player character the user made, plays or can see through their party. */
export function getPlayer(id, { signal } = {}) {
  return apiGet(`/api/players/${encodeURIComponent(id)}`, undefined, { signal });
}

/** Makes a player character the user owns. `request` is as `listPlayers` gives, without the answer-only fields. */
export function createPlayer(request) {
  return apiSend("POST", "/api/players", request);
}

/**
 * Replaces a player character. The owner can change anything; whoever only plays it can change its numbers and notes
 * (the rest must be sent as it is).
 */
export function updatePlayer(id, request) {
  return apiSend("PUT", `/api/players/${encodeURIComponent(id)}`, request);
}

/** Deletes a player character. Owner only. */
export function deletePlayer(id) {
  return apiSend("DELETE", `/api/players/${encodeURIComponent(id)}`);
}
