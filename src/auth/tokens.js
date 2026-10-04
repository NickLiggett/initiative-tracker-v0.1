// What sign-in gives the app (tokens), kept for the length of the browser tab.
//
// They are kept in sessionStorage: a reload keeps you signed in, closing the tab doesn't. Opening the app again then
// takes one click on "Sign in", which the identity provider answers at once while its own session lasts.

const SESSION_KEY = "initiative-tracker.auth.session";
const PENDING_KEY = "initiative-tracker.auth.pending";

/** The data inside a JWT (the middle part), or null if it isn't one. */
export function parseJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      [...atob(payload)].map((character) => "%" + character.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * A session from the identity provider's answer to a token request.
 * @param {number} [now] milliseconds since 1970, for the tests
 */
export function toSession(response, now = Date.now()) {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    idToken: response.id_token ?? null,
    expiresAt: now + (Number(response.expires_in) || 0) * 1000,
  };
}

/** Whole seconds until the access token stops working; 0 or less once it has. */
export function secondsLeft(session, now = Date.now()) {
  return Math.floor((session.expiresAt - now) / 1000);
}

/** Who the session is for: `{username, name, email}` as far as the tokens say. */
export function userOf(session) {
  const claims = parseJwt(session.idToken ?? "") ?? parseJwt(session.accessToken ?? "") ?? {};
  return { username: claims.preferred_username ?? null, name: claims.name ?? null, email: claims.email ?? null };
}

function read(key) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // storage turned off: signing in still works for this page, but not after a reload
  }
}

/** The tokens kept for this tab, if they look like a session. */
export function loadSession() {
  const session = read(SESSION_KEY);
  return session && typeof session.accessToken === "string" && Number.isFinite(session.expiresAt) ? session : null;
}

export const saveSession = (session) => write(SESSION_KEY, session);
export const clearSession = () => write(SESSION_KEY, null);

/** The secret of a sign-in that has been started and not yet finished: `{state, verifier, nonce}`. */
export const loadPending = () => read(PENDING_KEY);
export const savePending = (pending) => write(PENDING_KEY, pending);
export const clearPending = () => write(PENDING_KEY, null);
