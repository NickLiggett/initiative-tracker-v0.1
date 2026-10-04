import { getCurrentUser, listDocuments, listInvitations, listMembers } from "./documents";

/**
 * What the Sharing page shows: the signed-in user, the documents they own with who each is shared with, and the
 * documents other users have shared with them with the owner and the user's own role. Each owned document also has its
 * pending email invitations.
 *
 * @returns {Promise<{
 *   me: ?{id: number, username: string},
 *   owned: {document: object, members: {username: string, role: string}[], invitations: object[]}[],
 *   shared: {document: object, members: object[], owner: ?string, role: ?string}[]
 * }>}
 */
export async function loadSharing({ signal } = {}) {
  const [me, documents] = await Promise.all([getCurrentUser({ signal }), listDocuments({ signal })]);
  if (me?.id === undefined || me?.id === null) {
    return { me: null, owned: [], shared: [] };
  }
  // A document whose members can't be read is shown without them rather than failing the whole page.
  const membersOf = (document) => listMembers(document.key, { signal }).catch(() => []);
  const invitationsOf = (document) => listInvitations(document.key, { signal }).catch(() => []);

  const owned = await Promise.all(
    documents
      .filter((document) => document.ownerId === me.id)
      .map(async (document) => {
        const [members, invitations] = await Promise.all([membersOf(document), invitationsOf(document)]);
        return { document, members, invitations };
      }),
  );
  const shared = await Promise.all(
    documents
      .filter((document) => document.ownerId != null && document.ownerId !== me.id)
      .map(async (document) => {
        const members = await membersOf(document);
        return {
          document,
          members,
          owner: members.find((member) => member.role === "OWNER")?.username ?? null,
          role: members.find((member) => member.username === me.username)?.role ?? null,
        };
      }),
  );
  return { me, owned, shared };
}
