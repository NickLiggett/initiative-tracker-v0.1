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

/** Stops sharing a document with someone. The owner can remove anyone; others can only remove themselves. */
export function unshareDocument(documentKey, username) {
  return apiSend("DELETE", `/api/documents/${encodeURIComponent(documentKey)}/members/${encodeURIComponent(username)}`);
}
