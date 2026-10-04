// Talking to the identity provider (Keycloak, as set up by open5e-backend) by OpenID Connect, with the authorization
// code flow and PKCE: the browser goes to the provider to sign in, comes back with a code, and swaps it for tokens.

/**
 * Where to send people, from the environment. Without an issuer and a client id there is no sign-in: the app is in
 * development mode and uses the backend's `X-User` header instead.
 *
 * The settings can also be given when the app is served rather than when it is built: a `config.js` next to the page
 * sets `window.__APP_CONFIG__` to an object with the same names (`VITE_OIDC_ISSUER`, ...), and what it says, if it
 * says anything, wins. That is how one built image serves any environment (see `docker/`).
 * @returns {?{issuer: string, clientId: string, redirectUri: string}}
 */
export function readAuthConfig(env = import.meta.env, origin = window.location.origin, served = window.__APP_CONFIG__) {
  const given = Object.fromEntries(Object.entries(served ?? {}).filter(([, value]) => typeof value === "string" && value.trim()));
  const settings = { ...env, ...given };
  const issuer = (settings.VITE_OIDC_ISSUER ?? "").trim().replace(/\/+$/, "");
  const clientId = (settings.VITE_OIDC_CLIENT_ID ?? "").trim();
  if (!issuer || !clientId) {
    return null;
  }
  return { issuer, clientId, redirectUri: (settings.VITE_OIDC_REDIRECT_URI ?? "").trim() || `${origin}/` };
}

/** The provider's addresses. Keycloak lays them out under the realm's address (the issuer). */
function endpoints({ issuer }) {
  return {
    authorize: `${issuer}/protocol/openid-connect/auth`,
    registrations: `${issuer}/protocol/openid-connect/registrations`,
    token: `${issuer}/protocol/openid-connect/token`,
    logout: `${issuer}/protocol/openid-connect/logout`,
    account: `${issuer}/account`,
  };
}

/**
 * Where to send the browser to sign in, or to register (the same request to the provider's sign-up page).
 * @param {{challenge: string, state: string, nonce: string}} request what makes this one sign-in
 * @param {{register?: boolean}} [options]
 */
export function authorizationUrl(config, { challenge, state, nonce }, { register = false } = {}) {
  const url = new URL(register ? endpoints(config).registrations : endpoints(config).authorize);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: config.redirectUri,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/** Where someone who has forgotten their password starts: the provider's reset page, which comes back here after. */
export function resetPasswordUrl(config) {
  const url = new URL(`${config.issuer}/login-actions/reset-credentials`);
  url.search = new URLSearchParams({ client_id: config.clientId }).toString();
  return url.toString();
}

/** Where to send the browser to end the session at the provider too, and come back to the app. */
export function logoutUrl(config, idToken) {
  const url = new URL(endpoints(config).logout);
  const params = { client_id: config.clientId, post_logout_redirect_uri: config.redirectUri };
  if (idToken) {
    params.id_token_hint = idToken;
  }
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

/** The provider's page for managing the account (changing the password, the email address). */
export const accountUrl = (config) => endpoints(config).account;

/** Why sign-in or a token request didn't work. */
export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

async function requestTokens(config, parameters) {
  let response;
  try {
    response = await fetch(endpoints(config).token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ client_id: config.clientId, ...parameters }).toString(),
    });
  } catch {
    throw new AuthError("Couldn't reach the sign-in service.", "unreachable");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new AuthError(body.error_description || body.error || `Sign-in failed (${response.status}).`, body.error ?? "failed");
  }
  return body;
}

/** Swaps the code the provider sent back for tokens. */
export function exchangeCode(config, code, verifier) {
  return requestTokens(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  });
}

/** Gets new tokens with the refresh token, without the user doing anything. */
export function refreshTokens(config, refreshToken) {
  return requestTokens(config, { grant_type: "refresh_token", refresh_token: refreshToken });
}
