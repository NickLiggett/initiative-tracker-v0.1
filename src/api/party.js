import { apiGet, apiSend } from "./client";

const username = (name) => encodeURIComponent(name);

/**
 * The people in the user's party, as `{username, status}`: `PENDING` until they accept, then `ACCEPTED`.
 * @returns {Promise<{username: string, status: "PENDING"|"ACCEPTED"}[]>}
 */
export function listPartyMembers({ signal } = {}) {
  return apiGet("/api/party", undefined, { signal });
}

/** Asks a user (who must have signed in once) to join the party. Asking again changes nothing. */
export function inviteToParty(name) {
  return apiSend("PUT", `/api/party/members/${username(name)}`);
}

/** Removes someone from the party, or withdraws the request. */
export function removeFromParty(name) {
  return apiSend("DELETE", `/api/party/members/${username(name)}`);
}

/**
 * The parties the user has been asked to join or is in, as `{dm, status}`.
 * @returns {Promise<{dm: string, status: "PENDING"|"ACCEPTED"}[]>}
 */
export function listPartyInvitations({ signal } = {}) {
  return apiGet("/api/party/invitations", undefined, { signal });
}

/** Joins a DM's party. */
export function acceptPartyInvitation(dm) {
  return apiSend("POST", `/api/party/invitations/${username(dm)}/accept`);
}

/** Turns down a request to join a DM's party, or leaves it. */
export function leaveParty(dm) {
  return apiSend("DELETE", `/api/party/invitations/${username(dm)}`);
}

/**
 * The characters (called players here) of the people who have joined the user's party, which the user can see but not change (their
 * `role` is "PARTY").
 * @returns {Promise<object[]>}
 */
export function listPartyPlayers({ signal } = {}) {
  return apiGet("/api/party/players", undefined, { signal });
}

/**
 * The trackers of the DMs whose party the user has joined and whose fight one of their characters is in, as a player
 * may see them: in turn order (the first is up), with a monster's `ac` and `hp` null until the DM reveals them.
 * @returns {Promise<{dm: string, updatedAt: string, combatants: {id: number, name: string, initiative: ?number, type: string, playerId: ?number, mine: boolean, ac: ?number, hp: ?number, revealed: boolean}[]}[]>}
 */
export function listPartyTrackers({ signal } = {}) {
  return apiGet("/api/party/trackers", undefined, { signal });
}
