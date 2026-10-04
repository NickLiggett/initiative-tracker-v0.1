import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { apiGet, setAuthTokenProvider } from "../api/client";
import { stubApi } from "../test/fakeApi";
import { makeJwt } from "../test/jwt";
import { AuthProvider, useAuth } from "./AuthContext";
import { challengeFor } from "./pkce";
import { loadPending, loadSession, saveSession, savePending } from "./tokens";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setAuthTokenProvider(null);
  window.history.replaceState({}, "", "/");
});

const CONFIG = { issuer: "http://localhost:8180/realms/open5e", clientId: "initiative-tracker", redirectUri: "http://localhost:3000/" };
const TOKEN_ROUTE = `POST ${CONFIG.issuer}/protocol/openid-connect/token`;

let auth;
function Probe() {
  auth = useAuth();
  return (
    <p data-testid="auth">
      {auth.status}|{auth.user?.username ?? "-"}|{auth.error ?? "-"}
    </p>
  );
}
const state = () => screen.getByTestId("auth").textContent;
const status = () => state().split("|")[0];

/** What the provider answers a token request with. */
function tokens({ username = "dm", nonce = "N1", expiresIn = 3600, refresh = "REFRESH-1", access = "ACCESS-1" } = {}) {
  return {
    access_token: access,
    refresh_token: refresh,
    id_token: makeJwt({ preferred_username: username, iss: CONFIG.issuer, aud: [CONFIG.clientId], nonce }),
    expires_in: expiresIn,
  };
}

const problem = (error, description, status = 400) => () =>
  new Response(JSON.stringify({ error, error_description: description }), { status });

function renderAuth({ config = CONFIG, navigate = vi.fn(), strict = false } = {}) {
  const tree = (
    <AuthProvider config={config} navigate={navigate}>
      <Probe />
    </AuthProvider>
  );
  render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
  return navigate;
}

/** The address the provider sends the browser back to after a sign-in. */
const cameBackWith = (query) => window.history.replaceState({}, "", `/${query}`);
const tokenRequests = (fetchMock) => fetchMock.mock.calls.filter(([url]) => url.endsWith("/token"));
const storedSession = (secondsLeft, extra = {}) => ({
  accessToken: "STORED-ACCESS",
  refreshToken: "STORED-REFRESH",
  idToken: makeJwt({ preferred_username: "dm" }),
  expiresAt: Date.now() + secondsLeft * 1000,
  ...extra,
});

describe("with no sign-in set up", () => {
  it("is disabled, and does nothing", () => {
    const navigate = renderAuth({ config: null });

    expect(state()).toBe("disabled|-|-");
    act(() => auth.signIn());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("is also disabled without a provider at all", () => {
    function Bare() {
      return <p data-testid="auth">{useAuth().status}</p>;
    }
    render(<Bare />);

    expect(state()).toBe("disabled");
  });
});

describe("opening the app", () => {
  it("is signed out when nothing is kept", async () => {
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedOut|-|-"));
  });

  it("is signed in, without asking anyone, when a session that still works is kept", async () => {
    const fetchMock = stubApi({});
    saveSession(storedSession(600));
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedIn|dm|-"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renews a kept session that has ended, with its refresh token", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens({ access: "ACCESS-2", refresh: "REFRESH-2" }) });
    saveSession(storedSession(-10));
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedIn|dm|-"));
    expect(tokenRequests(fetchMock)).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1].body).toContain("grant_type=refresh_token");
    expect(fetchMock.mock.calls[0][1].body).toContain("refresh_token=STORED-REFRESH");
    expect(loadSession()).toMatchObject({ accessToken: "ACCESS-2", refreshToken: "REFRESH-2" });
  });

  it("is signed out, with a reason, when the kept session can't be renewed", async () => {
    stubApi({ [TOKEN_ROUTE]: problem("invalid_grant", "Session not active") });
    saveSession(storedSession(-10));
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedOut|-|Your session ended. Sign in again."));
    expect(loadSession()).toBeNull();
  });

  it("is signed out, with a reason, when a kept session has ended and the service can't be reached, and keeps it for a reload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    saveSession(storedSession(-10));
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(state()).toContain("Couldn't reach the sign-in service");
    expect(loadSession()).not.toBeNull();
  });
});

describe("signing in", () => {
  it("sends the browser to the provider with a challenge for a secret that only this tab knows", async () => {
    const navigate = renderAuth();
    await waitFor(() => expect(status()).toBe("signedOut"));

    await act(() => auth.signIn());

    const url = new URL(navigate.mock.calls[0][0]);
    expect(url.pathname).toBe("/realms/open5e/protocol/openid-connect/auth");
    const pending = loadPending();
    expect(url.searchParams.get("state")).toBe(pending.state);
    expect(url.searchParams.get("nonce")).toBe(pending.nonce);
    expect(url.searchParams.get("code_challenge")).toBe(await challengeFor(pending.verifier));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(pending.verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });

  it("starts each sign-in afresh", async () => {
    const navigate = renderAuth();
    await waitFor(() => expect(status()).toBe("signedOut"));

    await act(() => auth.signIn());
    const first = loadPending();
    await act(() => auth.signIn());

    expect(loadPending().state).not.toBe(first.state);
    expect(loadPending().verifier).not.toBe(first.verifier);
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it("sends the browser to the sign-up page to create an account", async () => {
    const navigate = renderAuth();
    await waitFor(() => expect(status()).toBe("signedOut"));

    await act(() => auth.register());

    expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/realms/open5e/protocol/openid-connect/registrations");
    expect(loadPending()).not.toBeNull(); // it comes back the same way as a sign-in
  });

  it("sends the browser to reset a forgotten password", async () => {
    const navigate = renderAuth();
    await waitFor(() => expect(status()).toBe("signedOut"));

    act(() => auth.forgotPassword());

    const url = new URL(navigate.mock.calls[0][0]);
    expect(url.pathname).toBe("/realms/open5e/login-actions/reset-credentials");
    expect(url.searchParams.get("client_id")).toBe("initiative-tracker");
  });
});

describe("coming back from the provider", () => {
  const started = () => savePending({ state: "STATE-1", verifier: "VERIFIER-1", nonce: "N1" });

  it("swaps the code for tokens, proving it with the secret, and is signed in", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens() });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1&session_state=abc&iss=http%3A%2F%2Flocalhost%3A8180%2Frealms%2Fopen5e");
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedIn|dm|-"));
    const form = Object.fromEntries(new URLSearchParams(tokenRequests(fetchMock)[0][1].body));
    expect(form).toMatchObject({ grant_type: "authorization_code", code: "CODE-1", code_verifier: "VERIFIER-1", redirect_uri: "http://localhost:3000/" });
    expect(loadSession()).toMatchObject({ accessToken: "ACCESS-1", refreshToken: "REFRESH-1" });
    expect(loadPending()).toBeNull(); // used once
  });

  it("takes the code out of the address, so a reload can't try to use it again", async () => {
    stubApi({ [TOKEN_ROUTE]: tokens() });
    started();
    window.history.replaceState({}, "", "/?code=CODE-1&state=STATE-1&session_state=abc&iss=x&keep=this#section");
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedIn"));
    expect(window.location.search).toBe("?keep=this");
    expect(window.location.hash).toBe("#section");
  });

  it("finishes the sign-in only once, though React runs its effects twice while developing", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens() });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth({ strict: true });

    await waitFor(() => expect(state()).toBe("signedIn|dm|-"));
    expect(tokenRequests(fetchMock)).toHaveLength(1);
  });

  it("gives the API client the token to send with every request", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens({ access: "THE-ACCESS-TOKEN" }), "GET /api/me": { id: 1, username: "dm" } });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth();
    await waitFor(() => expect(status()).toBe("signedIn"));

    await apiGet("/api/me");

    const [, init] = fetchMock.mock.calls.find(([url]) => url === "/api/me");
    expect(init.headers.Authorization).toBe("Bearer THE-ACCESS-TOKEN");
    expect(init.headers["X-User"]).toBeUndefined();
  });

  it("refuses an answer to a sign-in that wasn't started here, or has been started again since", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens() });
    started();
    cameBackWith("?code=CODE-1&state=SOMEONE-ELSES");
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(state()).toContain("wasn't started here");
    expect(tokenRequests(fetchMock)).toHaveLength(0);
  });

  it("refuses an answer when no sign-in was started at all", async () => {
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens() });
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(tokenRequests(fetchMock)).toHaveLength(0);
  });

  it("says what the provider said when it sent an error back, such as the user turning back", async () => {
    started();
    cameBackWith("?error=access_denied&error_description=User+cancelled&state=STATE-1");
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedOut|-|Sign-in didn't finish: User cancelled."));
    expect(loadPending()).toBeNull();
  });

  it("says why when the code can't be swapped for tokens", async () => {
    stubApi({ [TOKEN_ROUTE]: problem("invalid_grant", "Code not valid") });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth();

    await waitFor(() => expect(state()).toBe("signedOut|-|Code not valid"));
    expect(loadSession()).toBeNull();
  });

  it("refuses tokens that answer a different sign-in", async () => {
    stubApi({ [TOKEN_ROUTE]: tokens({ nonce: "NOT-OURS" }) });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(state()).toContain("wasn't meant for this app");
    expect(loadSession()).toBeNull();
  });

  it("refuses an ID token for another app", async () => {
    const wrong = tokens();
    wrong.id_token = makeJwt({ preferred_username: "dm", iss: CONFIG.issuer, aud: "some-other-app", nonce: "N1" });
    stubApi({ [TOKEN_ROUTE]: wrong });
    started();
    cameBackWith("?code=CODE-1&state=STATE-1");
    renderAuth();

    await waitFor(() => expect(status()).toBe("signedOut"));
    expect(state()).toContain("wasn't meant for this app");
  });
});

describe("staying signed in", () => {
  it("renews the tokens before they stop working, and keeps going on the new ones", async () => {
    vi.useFakeTimers();
    const fetchMock = stubApi({ [TOKEN_ROUTE]: tokens({ access: "ACCESS-2", refresh: "REFRESH-2", expiresIn: 3600 }) });
    saveSession(storedSession(120));
    renderAuth();
    await act(async () => {});
    expect(state()).toBe("signedIn|dm|-");
    expect(tokenRequests(fetchMock)).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000); // a minute before the end is 60 seconds in
    });
    expect(tokenRequests(fetchMock)).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(tokenRequests(fetchMock)).toHaveLength(1);
    expect(loadSession()).toMatchObject({ accessToken: "ACCESS-2", refreshToken: "REFRESH-2" });
    expect(status()).toBe("signedIn");
  });

  /**
   * Signed in with a session that has two minutes left, then the clock moves on to 20 seconds before the end without
   * the renewal timer going off, as when a laptop has been asleep.
   */
  async function signedInNearTheEnd(routes) {
    vi.useFakeTimers();
    const fetchMock = stubApi(routes);
    saveSession(storedSession(120));
    renderAuth();
    await act(async () => {});
    expect(status()).toBe("signedIn");
    vi.setSystemTime(Date.now() + 100_000);
    fetchMock.mockClear();
    return fetchMock;
  }

  it("renews a token that is about to stop working before sending it, once however many requests are waiting", async () => {
    const fetchMock = await signedInNearTheEnd({
      [TOKEN_ROUTE]: tokens({ access: "FRESH-ACCESS" }),
      "GET /api/one": {},
      "GET /api/two": {},
    });

    await act(async () => {
      await Promise.all([apiGet("/api/one"), apiGet("/api/two")]);
    });

    expect(tokenRequests(fetchMock)).toHaveLength(1);
    const sent = fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/")).map(([, init]) => init.headers.Authorization);
    expect(sent).toEqual(["Bearer FRESH-ACCESS", "Bearer FRESH-ACCESS"]);
  });

  it("signs out, with a reason, if the tokens can't be renewed", async () => {
    await signedInNearTheEnd({ [TOKEN_ROUTE]: problem("invalid_grant", "Token is not active"), "GET /api/one": {} });

    await act(async () => {
      await apiGet("/api/one");
    });

    expect(state()).toBe("signedOut|-|Your session ended. Sign in again.");
    expect(loadSession()).toBeNull();
  });

  it("carries on, and tries again later, if the service can't be reached while signed in", async () => {
    const fetchMock = await signedInNearTheEnd({ "GET /api/one": {} });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch")); // the renewal can't get through
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 200 })); // the request itself can

    await act(async () => {
      await apiGet("/api/one");
    });

    expect(status()).toBe("signedIn"); // not thrown out for a hiccup
    expect(loadSession()).not.toBeNull();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer STORED-ACCESS"); // the token it had

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(tokens({ access: "ACCESS-LATER" })), { status: 200 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000); // the retry
    });
    expect(tokenRequests(fetchMock)).toHaveLength(1);
    expect(loadSession().accessToken).toBe("ACCESS-LATER");
  });
});

describe("signing out", () => {
  it("forgets the tokens, and ends the session at the provider, which sends the browser back", async () => {
    const idToken = makeJwt({ preferred_username: "dm" });
    saveSession(storedSession(600, { idToken }));
    const navigate = renderAuth();
    await waitFor(() => expect(status()).toBe("signedIn"));

    act(() => auth.signOut());

    expect(state()).toBe("signedOut|-|-");
    expect(loadSession()).toBeNull();
    const url = new URL(navigate.mock.calls[0][0]);
    expect(url.pathname).toBe("/realms/open5e/protocol/openid-connect/logout");
    expect(url.searchParams.get("id_token_hint")).toBe(idToken);
  });

  it("sends no token afterwards", async () => {
    const fetchMock = stubApi({ "GET /api/me": {} });
    saveSession(storedSession(600));
    renderAuth();
    await waitFor(() => expect(status()).toBe("signedIn"));
    act(() => auth.signOut());

    await apiGet("/api/me");

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
