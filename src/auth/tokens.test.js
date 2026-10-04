import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJwt } from "../test/jwt";
import {
  clearPending,
  clearSession,
  loadPending,
  loadSession,
  parseJwt,
  savePending,
  saveSession,
  secondsLeft,
  toSession,
  userOf,
} from "./tokens";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("parseJwt", () => {
  it("reads the claims, including accented and other non-ASCII text", () => {
    expect(parseJwt(makeJwt({ preferred_username: "dm", name: "Zoë Müller 🐉" }))).toEqual({
      preferred_username: "dm",
      name: "Zoë Müller 🐉",
    });
  });

  it("is null for anything that isn't one", () => {
    for (const bad of ["", "nonsense", "a.b.c", "a..c", null, undefined, 5]) {
      expect(parseJwt(bad)).toBeNull();
    }
  });
});

describe("toSession and secondsLeft", () => {
  const response = { access_token: "access", refresh_token: "refresh", id_token: "id", expires_in: 300 };

  it("works out when the access token stops working", () => {
    expect(toSession(response, 1_000_000)).toEqual({ accessToken: "access", refreshToken: "refresh", idToken: "id", expiresAt: 1_300_000 });
  });

  it("copes with tokens the provider didn't send", () => {
    expect(toSession({ access_token: "access", expires_in: 60 }, 0)).toEqual({ accessToken: "access", refreshToken: null, idToken: null, expiresAt: 60_000 });
  });

  it("counts whole seconds left, and goes below zero once it has ended", () => {
    const session = toSession(response, 1_000_000);

    expect(secondsLeft(session, 1_000_000)).toBe(300);
    expect(secondsLeft(session, 1_299_500)).toBe(0);
    expect(secondsLeft(session, 1_310_000)).toBe(-10);
  });
});

describe("userOf", () => {
  it("is who the ID token says", () => {
    const idToken = makeJwt({ preferred_username: "dm", name: "Dungeon Master", email: "dm@example.com" });

    expect(userOf({ idToken, accessToken: "x" })).toEqual({ username: "dm", name: "Dungeon Master", email: "dm@example.com" });
  });

  it("falls back to the access token, and is empty when neither says", () => {
    expect(userOf({ idToken: null, accessToken: makeJwt({ preferred_username: "player" }) }).username).toBe("player");
    expect(userOf({ idToken: null, accessToken: "opaque" })).toEqual({ username: null, name: null, email: null });
  });
});

describe("keeping the session", () => {
  const session = { accessToken: "a", refreshToken: "r", idToken: "i", expiresAt: 123456 };

  it("gives back what was kept, until it is cleared", () => {
    expect(loadSession()).toBeNull();
    saveSession(session);
    expect(loadSession()).toEqual(session);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("is kept for the tab, not for good", () => {
    saveSession(session);

    expect(window.sessionStorage.getItem("initiative-tracker.auth.session")).not.toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("doesn't take what isn't a session", () => {
    for (const bad of ["{broken", "null", JSON.stringify({ accessToken: 5, expiresAt: 1 }), JSON.stringify({ accessToken: "a" }), JSON.stringify({ accessToken: "a", expiresAt: "soon" })]) {
      window.sessionStorage.setItem("initiative-tracker.auth.session", bad);
      expect(loadSession()).toBeNull();
    }
  });

  it("keeps the secret of a sign-in that has started, apart from the session", () => {
    savePending({ state: "s", verifier: "v", nonce: "n" });

    expect(loadPending()).toEqual({ state: "s", verifier: "v", nonce: "n" });
    expect(loadSession()).toBeNull();
    clearPending();
    expect(loadPending()).toBeNull();
  });

  it("carries on when the browser won't store anything", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => saveSession(session)).not.toThrow();
    expect(() => savePending({ state: "s" })).not.toThrow();
    expect(loadSession()).toBeNull();
    expect(loadPending()).toBeNull();
  });
});
