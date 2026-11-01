import { apiGet, apiSend } from "./client";

/**
 * Asking people to play characters. Nobody can be made the player of a character: its owner asks an email address, and the
 * person plays it only by accepting, signed in with that address verified.
 */

/**
 * Asks an email address to play a character the user owns, and has it emailed. Asking the same address while the request
 * waits changes nothing. Resolves to the request, whose `emailSent` says whether the email went out.
 * @returns {Promise<{id: number, playerId: number, characterName: string, email: string, status: "PENDING"|"DENIED", createdAt: string, expiresAt: string, respondedAt: ?string, askAgainAt: ?string, emailSent: boolean}>}
 */
export function askToPlay(playerId, email) {
  return apiSend("POST", `/api/players/${encodeURIComponent(playerId)}/requests`, { email });
}

/** The requests the user has made that wait for an answer or were turned down (`status` "DENIED"), same shape as `askToPlay`. */
export function listSentRequests({ signal } = {}) {
  return apiGet("/api/character-requests/sent", undefined, { signal });
}

/** Withdraws a request that waits, or dismisses one that was turned down. */
export function cancelRequest(id) {
  return apiSend("DELETE", `/api/character-requests/${encodeURIComponent(id)}`);
}

/**
 * The requests to play a character that wait for the user's answer.
 * @returns {Promise<{id: number, characterName: string, className: ?string, speciesName: ?string, level: number, owner: string, createdAt: string, expiresAt: string}[]>}
 */
export function listReceivedRequests({ signal } = {}) {
  return apiGet("/api/character-requests/received", undefined, { signal });
}

/** Agrees to play the character. */
export function acceptRequest(id) {
  return apiSend("POST", `/api/character-requests/${encodeURIComponent(id)}/accept`);
}

/** Turns the request down. */
export function denyRequest(id) {
  return apiSend("POST", `/api/character-requests/${encodeURIComponent(id)}/deny`);
}
