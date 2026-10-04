import { apiGet, apiSend } from "./client";

/** The signed-in user: `{id, username}`. */
export function getCurrentUser({ signal } = {}) {
  return apiGet("/api/me", undefined, { signal });
}

/**
 * The documents the user can see: default content, their own, and those shared with them. Default content has no
 * `ownerId`.
 * @returns {Promise<object[]>}
 */
export async function listDocuments({ signal } = {}) {
  const page = await apiGet("/api/documents", { pageSize: 100, sort: "name" }, { signal });
  return page.content;
}

/**
 * Who a document is shared with, as `{username, role}`, the owner first with the role OWNER. Anyone who can see the
 * document can ask.
 * @returns {Promise<{username: string, role: "OWNER"|"EDITOR"|"VIEWER"}[]>}
 */
export function listMembers(documentKey, { signal } = {}) {
  return apiGet(`/api/documents/${encodeURIComponent(documentKey)}/members`, undefined, { signal });
}

/**
 * Shares one of the user's documents with someone, or changes their role. A VIEWER can see the document's content; an
 * EDITOR can also change it. The user must exist, which is to say have signed in once.
 * @param {"VIEWER"|"EDITOR"} role
 */
export function shareDocument(documentKey, username, role) {
  return apiSend("PUT", `/api/documents/${encodeURIComponent(documentKey)}/members/${encodeURIComponent(username)}`, { role });
}

/**
 * Invites an email address to one of the user's documents. If a user has already verified that address they are added
 * at once (`username` is set); otherwise they are emailed, and get access when they sign in with that address.
 * @param {"VIEWER"|"EDITOR"} role
 * @returns {Promise<{email: string, role: string, username: ?string, emailSent: boolean}>}
 */
export function inviteByEmail(documentKey, email, role) {
  return apiSend("POST", `/api/documents/${encodeURIComponent(documentKey)}/invitations`, { email, role });
}

/**
 * A document's pending invitations (owner only), newest first.
 * @returns {Promise<{id: number, email: string, role: string, invitedBy: string, createdAt: string, expiresAt: string}[]>}
 */
export function listInvitations(documentKey, { signal } = {}) {
  return apiGet(`/api/documents/${encodeURIComponent(documentKey)}/invitations`, undefined, { signal });
}

/** Cancels a pending invitation. */
export function cancelInvitation(documentKey, invitationId) {
  return apiSend("DELETE", `/api/documents/${encodeURIComponent(documentKey)}/invitations/${encodeURIComponent(invitationId)}`);
}

/** Stops sharing a document with someone. The owner can remove anyone; others can only remove themselves. */
export function unshareDocument(documentKey, username) {
  return apiSend("DELETE", `/api/documents/${encodeURIComponent(documentKey)}/members/${encodeURIComponent(username)}`);
}
