// PKCE (RFC 7636): how the app proves, when it swaps the code it is given for tokens, that it is the one that asked.
// It makes a secret (the verifier), sends only a fingerprint of it (the challenge) when signing in, and shows the
// secret itself when collecting the tokens, so a stolen code is no use to anyone else.

/** Bytes as URL-safe base64 without padding, as PKCE and JWTs write it. */
export function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Random text made only of URL-safe characters, from `byteLength` random bytes. */
export function randomString(byteLength = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** The challenge for a verifier: the SHA-256 of it, as base64url. */
export async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** A new secret and its challenge. The verifier is 64 characters (the standard allows 43 to 128). */
export async function createPkce() {
  const verifier = randomString(48);
  return { verifier, challenge: await challengeFor(verifier) };
}
