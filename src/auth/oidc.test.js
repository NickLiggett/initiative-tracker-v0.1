import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError, accountUrl, authorizationUrl, exchangeCode, logoutUrl, readAuthConfig, refreshTokens, resetPasswordUrl } from "./oidc";

afterEach(() => vi.unstubAllGlobals());

const CONFIG = { issuer: "http://localhost:8180/realms/open5e", clientId: "initiative-tracker", redirectUri: "http://localhost:3000/" };
const TOKEN_URL = "http://localhost:8180/realms/open5e/protocol/openid-connect/token";

describe("readAuthConfig", () => {
  it("is no sign-in without an issuer and a client id", () => {
    expect(readAuthConfig({}, "http://localhost:3000")).toBeNull();
    expect(readAuthConfig({ VITE_OIDC_ISSUER: CONFIG.issuer }, "http://localhost:3000")).toBeNull();
    expect(readAuthConfig({ VITE_OIDC_CLIENT_ID: "x" }, "http://localhost:3000")).toBeNull();
    expect(readAuthConfig({ VITE_OIDC_ISSUER: "  ", VITE_OIDC_CLIENT_ID: "x" }, "http://localhost:3000")).toBeNull();
  });

  it("comes back to the app's own address by default", () => {
    expect(readAuthConfig({ VITE_OIDC_ISSUER: CONFIG.issuer, VITE_OIDC_CLIENT_ID: "initiative-tracker" }, "http://localhost:3000")).toEqual(CONFIG);
  });

  it("tidies the issuer, and takes another address to come back to", () => {
    const config = readAuthConfig(
      { VITE_OIDC_ISSUER: ` ${CONFIG.issuer}/ `, VITE_OIDC_CLIENT_ID: " initiative-tracker ", VITE_OIDC_REDIRECT_URI: "https://app.example/done" },
      "http://localhost:3000",
    );

    expect(config).toEqual({ ...CONFIG, redirectUri: "https://app.example/done" });
  });
});

describe("addresses", () => {
  const request = { challenge: "CHALLENGE", state: "STATE", nonce: "NONCE" };

  it("sends the browser to sign in, saying who is asking and how the code will be proved", () => {
    const url = new URL(authorizationUrl(CONFIG, request));

    expect(`${url.origin}${url.pathname}`).toBe("http://localhost:8180/realms/open5e/protocol/openid-connect/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "initiative-tracker",
      response_type: "code",
      scope: "openid profile email",
      redirect_uri: "http://localhost:3000/",
      state: "STATE",
      nonce: "NONCE",
      code_challenge: "CHALLENGE",
      code_challenge_method: "S256",
    });
  });

  it("sends the browser to the sign-up page for a new account, with the same request", () => {
    const url = new URL(authorizationUrl(CONFIG, request, { register: true }));

    expect(url.pathname).toBe("/realms/open5e/protocol/openid-connect/registrations");
    expect(url.searchParams.get("code_challenge")).toBe("CHALLENGE");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/");
  });

  it("starts a password reset for this app", () => {
    const url = new URL(resetPasswordUrl(CONFIG));

    expect(url.pathname).toBe("/realms/open5e/login-actions/reset-credentials");
    expect(url.searchParams.get("client_id")).toBe("initiative-tracker");
  });

  it("ends the session at the provider, and comes back to the app", () => {
    const url = new URL(logoutUrl(CONFIG, "ID.TOKEN"));

    expect(url.pathname).toBe("/realms/open5e/protocol/openid-connect/logout");
    expect(url.searchParams.get("id_token_hint")).toBe("ID.TOKEN");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000/");
    expect(url.searchParams.get("client_id")).toBe("initiative-tracker");
  });

  it("can end the session without an ID token", () => {
    expect(new URL(logoutUrl(CONFIG, null)).searchParams.has("id_token_hint")).toBe(false);
  });

  it("finds the account page", () => {
    expect(accountUrl(CONFIG)).toBe("http://localhost:8180/realms/open5e/account");
  });
});

describe("token requests", () => {
  const answer = (body, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("swaps a code for tokens, proving it with the verifier", async () => {
    vi.stubGlobal("fetch", answer({ access_token: "A", refresh_token: "R", id_token: "I", expires_in: 300 }));

    await expect(exchangeCode(CONFIG, "CODE", "VERIFIER")).resolves.toMatchObject({ access_token: "A", refresh_token: "R" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      client_id: "initiative-tracker",
      grant_type: "authorization_code",
      code: "CODE",
      redirect_uri: "http://localhost:3000/",
      code_verifier: "VERIFIER",
    });
  });

  it("gets new tokens with the refresh token", async () => {
    vi.stubGlobal("fetch", answer({ access_token: "A2", expires_in: 300 }));

    await refreshTokens(CONFIG, "REFRESH");

    expect(Object.fromEntries(new URLSearchParams(fetch.mock.calls[0][1].body))).toEqual({
      client_id: "initiative-tracker",
      grant_type: "refresh_token",
      refresh_token: "REFRESH",
    });
  });

  it("says why when the provider refuses", async () => {
    vi.stubGlobal("fetch", answer({ error: "invalid_grant", error_description: "Code not valid" }, 400));

    const failure = await exchangeCode(CONFIG, "CODE", "V").catch((e) => e);

    expect(failure).toBeInstanceOf(AuthError);
    expect(failure.message).toBe("Code not valid");
    expect(failure.code).toBe("invalid_grant");
  });

  it("copes with an answer that isn't what it expects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 })));

    const failure = await refreshTokens(CONFIG, "R").catch((e) => e);

    expect(failure).toBeInstanceOf(AuthError);
    expect(failure.message).toBe("Sign-in failed (502).");

    vi.stubGlobal("fetch", answer({ expires_in: 300 }, 200)); // no access token at all
    await expect(refreshTokens(CONFIG, "R")).rejects.toBeInstanceOf(AuthError);
  });

  it("says when the provider can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const failure = await exchangeCode(CONFIG, "C", "V").catch((e) => e);

    expect(failure.code).toBe("unreachable");
    expect(failure.message).toBe("Couldn't reach the sign-in service.");
  });
});
