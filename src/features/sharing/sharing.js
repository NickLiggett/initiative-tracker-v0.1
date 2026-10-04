// Small rules for the Sharing page, as plain functions.

/** What a role lets someone do, for people to read. */
export const ROLE_LABELS = {
  OWNER: "Owner",
  EDITOR: "Can edit",
  VIEWER: "Can view",
};

/** The roles an owner can give, in the order they are offered. */
export const SHARE_ROLES = ["VIEWER", "EDITOR"];

/** What someone typed as a username, as the backend knows it: no spaces or "@", in lower case. */
export function normalizeUsername(text) {
  return text.trim().replace(/^@+/, "").toLowerCase();
}

const EMAIL = /^[^@\s,;<>()[\]"]+@[^@\s,;<>()[\]"]+\.[^@\s,;<>()[\]"]+$/;

/**
 * What someone typed in "Share with": an email address to invite (trimmed, in lower case), or else a username.
 * @returns {{kind: "email"|"username", value: string}}
 */
export function parseShareTarget(text) {
  const trimmed = text.trim();
  return EMAIL.test(trimmed) ? { kind: "email", value: trimmed.toLowerCase() } : { kind: "username", value: normalizeUsername(text) };
}

/** Why the target can't be shared with, or null if it can; see {@link shareProblem}. An email address is up to the backend. */
export function shareTargetProblem(target, members) {
  if (target.kind === "email") {
    return null;
  }
  return target.value ? shareProblem(target.value, members) : "Type a username or an email address.";
}

/** What inviting an address did, in words, and whether it is something to look at (a warning). */
export function inviteNotice(result) {
  if (result.username) {
    return { severity: "success", text: `${result.email} already has an account, so ${result.username} can see it now.` };
  }
  if (result.emailSent) {
    return { severity: "success", text: `Invited ${result.email}. They get access when they sign in with that address.` };
  }
  return {
    severity: "warning",
    text: `Invited ${result.email}, but the email couldn't be sent. They still get access when they sign in with that address.`,
  };
}

/**
 * Why a username can't be shared with, or null if it can: it is empty, it is the owner, or the document is already
 * shared with them.
 * @param {{username: string, role: string}[]} members who the document is shared with, the owner included
 */
export function shareProblem(username, members) {
  if (!username) {
    return "Type a username.";
  }
  const existing = members.find((member) => member.username === username);
  if (existing?.role === "OWNER") {
    return "That's you: you already own it.";
  }
  if (existing) {
    return `${username} can already see this. Change what they can do in the list above.`;
  }
  return null;
}

/** A sharing error in words that say what to do. */
export function sharingErrorMessage(error, username) {
  if (error?.status === 404 && /No user/i.test(error.message)) {
    return `There's no user called ${username}. They need to have signed in to the app once before you can share with them.`;
  }
  return error?.message || "Something went wrong.";
}
