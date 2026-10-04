/** A JWT with these claims, for tests. It is not signed: nothing in the app checks that, the backend does. */
export function makeJwt(claims) {
  const part = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${part({ alg: "none", typ: "JWT" })}.${part(claims)}.signature`;
}
