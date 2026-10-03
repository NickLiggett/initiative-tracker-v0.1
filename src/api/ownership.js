import { apiGet } from "./client";

/**
 * The keys of the documents the signed-in user owns (their homebrew), which are the ones whose content they can
 * change. Other users' homebrew that is shared with them can be read but, here, not changed.
 * @returns {Promise<Set<string>>}
 */
export async function listOwnedDocumentKeys({ signal } = {}) {
  const [me, documents] = await Promise.all([
    apiGet("/api/me", undefined, { signal }),
    apiGet("/api/documents", { pageSize: 100 }, { signal }),
  ]);
  // Without an id on both sides nothing is owned: undefined must not equal undefined.
  if (me?.id === undefined || me?.id === null) {
    return new Set();
  }
  return new Set(
    (documents.content ?? []).filter((document) => document.ownerId === me.id).map((document) => document.key),
  );
}
