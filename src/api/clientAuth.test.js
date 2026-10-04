import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiSend, setAuthTokenProvider } from "./client";

afterEach(() => {
  setAuthTokenProvider(null);
  vi.unstubAllGlobals();
});

const stub = () => vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}")));
const headersOfCall = (index = 0) => fetch.mock.calls[index][1].headers;

describe("the API client when there is sign-in", () => {
  it("sends the user's token with every kind of request", async () => {
    stub();
    setAuthTokenProvider(async () => "THE-TOKEN");

    await apiGet("/api/me");
    await apiSend("PUT", "/api/me/settings", { mode: "dark" });
    await apiSend("DELETE", "/api/creatures/x");

    for (const index of [0, 1, 2]) {
      expect(headersOfCall(index).Authorization).toBe("Bearer THE-TOKEN");
    }
  });

  it("asks for the token each time, so a renewed one is used", async () => {
    stub();
    const tokens = ["FIRST", "SECOND"];
    setAuthTokenProvider(async () => tokens.shift());

    await apiGet("/api/a");
    await apiGet("/api/b");

    expect([headersOfCall(0).Authorization, headersOfCall(1).Authorization]).toEqual(["Bearer FIRST", "Bearer SECOND"]);
  });

  it("never sends the development header, whoever the environment says to be", async () => {
    stub();
    setAuthTokenProvider(async () => "THE-TOKEN");

    await apiGet("/api/me");

    expect(headersOfCall()["X-User"]).toBeUndefined();
  });

  it("sends neither when nobody is signed in", async () => {
    stub();
    setAuthTokenProvider(async () => null);

    await apiGet("/api/creatures");

    expect(headersOfCall().Authorization).toBeUndefined();
    expect(headersOfCall()["X-User"]).toBeUndefined();
  });

  it("sends a picture with its token and its own type", async () => {
    stub();
    setAuthTokenProvider(async () => "THE-TOKEN");

    await apiSend("PUT", "/api/me/avatar", new Blob(["x"], { type: "image/webp" }));

    expect(headersOfCall()).toMatchObject({ Authorization: "Bearer THE-TOKEN", "Content-Type": "image/webp" });
  });

  it("can be switched off again", async () => {
    stub();
    setAuthTokenProvider(async () => "THE-TOKEN");
    setAuthTokenProvider(null);

    await apiGet("/api/me");

    expect(headersOfCall().Authorization).toBeUndefined();
  });
});
