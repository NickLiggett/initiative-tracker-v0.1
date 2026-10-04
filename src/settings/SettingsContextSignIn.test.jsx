import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, render, waitFor } from "@testing-library/react";
import { setAuthTokenProvider } from "../api/client";
import { AuthProvider } from "../auth/AuthContext";
import { saveSession } from "../auth/tokens";
import { stubApi } from "../test/fakeApi";
import { makeJwt } from "../test/jwt";
import { SettingsProvider, useSettings } from "./SettingsContext";

afterEach(() => {
  setAuthTokenProvider(null);
  vi.unstubAllGlobals();
});

const CONFIG = { issuer: "http://localhost:8180/realms/open5e", clientId: "initiative-tracker", redirectUri: "http://localhost:3000/" };

function Who() {
  return <p data-testid="who">{useSettings().username ?? "nobody"}</p>;
}

function renderSettings() {
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dm" },
    "GET /api/me/settings": { mode: "dark", avatarVersion: null },
  });
  render(
    <AuthProvider config={CONFIG} navigate={vi.fn()}>
      <SettingsProvider>
        <Who />
      </SettingsProvider>
    </AuthProvider>,
  );
  return fetchMock;
}

const accountRequests = (fetchMock) => fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/me"));

describe("SettingsProvider with sign-in", () => {
  it("asks the account for nothing while nobody is signed in", async () => {
    const fetchMock = renderSettings();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(accountRequests(fetchMock)).toHaveLength(0);
    expect(screen.getByTestId("who")).toHaveTextContent("nobody");
  });

  it("asks once someone is signed in, with their token", async () => {
    saveSession({ accessToken: "THE-TOKEN", refreshToken: "R", idToken: makeJwt({ preferred_username: "dm" }), expiresAt: Date.now() + 600_000 });
    const fetchMock = renderSettings();

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("dm"));
    await waitFor(() => expect(accountRequests(fetchMock).length).toBeGreaterThanOrEqual(2)); // who they are, and their settings
    for (const [, init] of accountRequests(fetchMock)) {
      expect(init.headers.Authorization).toBe("Bearer THE-TOKEN");
    }
  });
});
