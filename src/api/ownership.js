import { getCurrentUser, listDocuments, listMembers } from "./documents";

/**
 * The keys of the documents whose content the signed-in user can change: the ones they own (their homebrew), and
 * those another user has shared with them as an EDITOR. Documents shared as a VIEWER can be read but not changed.
 * @returns {Promise<Set<string>>}
 */
export async function listWritableDocumentKeys({ signal } = {}) {
  const [me, documents] = await Promise.all([getCurrentUser({ signal }), listDocuments({ signal })]);
  // Without an id on both sides nothing is theirs: undefined must not equal undefined.
  if (me?.id === undefined || me?.id === null) {
    return new Set();
  }
  const owned = documents.filter((document) => document.ownerId === me.id);
  const others = documents.filter((document) => document.ownerId != null && document.ownerId !== me.id);

  // Someone else's document: the user can change it if its members say they are an editor. If that can't be found
  // out, they can't.
  const edited = await Promise.all(
    others.map(async (document) => {
      try {
        const members = await listMembers(document.key, { signal });
        return members.some((member) => member.username === me.username && member.role === "EDITOR") ? document.key : null;
      } catch {
        return null;
      }
    }),
  );
  return new Set([...owned.map((document) => document.key), ...edited.filter(Boolean)]);
}
