import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setAuthTokenProvider } from "../../api/client";
import { AuthProvider } from "../../auth/AuthContext";
import { loadSession, saveSession } from "../../auth/tokens";
import { stubApi } from "../../test/fakeApi";
import { makeJwt } from "../../test/jwt";
import { SettingsProvider } from "../../settings/SettingsContext";
import UserMenu from "./UserMenu";

afterEach(() => {
  setAuthTokenProvider(null);
  vi.unstubAllGlobals();
});

const CONFIG = { issuer: "http://localhost:8180/realms/open5e", clientId: "initiative-tracker", redirectUri: "http://localhost:3000/" };

function renderMenu({ config = CONFIG, navigate = vi.fn() } = {}) {
  stubApi({ "GET /api/me": { id: 1, username: "dm" }, "GET /api/me/settings": { avatarVersion: null } });
  render(
    <AuthProvider config={config} navigate={navigate}>
      <SettingsProvider>
        <UserMenu onOpenSettings={() => {}} />
      </SettingsProvider>
    </AuthProvider>,
  );
  return navigate;
}

const openMenu = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
  return within(await screen.findByRole("menu"));
};

describe("UserMenu with sign-in", () => {
  it("offers to manage the account and to sign out, after the settings", async () => {
    saveSession({ accessToken: "A", refreshToken: "R", idToken: makeJwt({ preferred_username: "dm" }), expiresAt: Date.now() + 600_000 });
    renderMenu();
    await waitFor(() => expect(screen.getByText("D")).toBeInTheDocument());

    const menu = await openMenu();

    expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Profile", "Appearance", "Manage account", "Sign out"]);
    expect(menu.getByRole("menuitem", { name: "Manage account" })).toHaveAttribute("href", "http://localhost:8180/realms/open5e/account");
    expect(menu.getByRole("menuitem", { name: "Manage account" })).toHaveAttribute("target", "_blank");
  });

  it("signs out: forgets the session and goes to end it at the provider", async () => {
    const idToken = makeJwt({ preferred_username: "dm" });
    saveSession({ accessToken: "A", refreshToken: "R", idToken, expiresAt: Date.now() + 600_000 });
    const navigate = renderMenu();
    await waitFor(() => expect(screen.getByText("D")).toBeInTheDocument());

    fireEvent.click((await openMenu()).getByRole("menuitem", { name: "Sign out" }));

    expect(loadSession()).toBeNull();
    const url = new URL(navigate.mock.calls[0][0]);
    expect(url.pathname).toBe("/realms/open5e/protocol/openid-connect/logout");
    expect(url.searchParams.get("id_token_hint")).toBe(idToken);
  });

  it("has neither when the app has no sign-in, as in development", async () => {
    renderMenu({ config: null });
    await waitFor(() => expect(screen.getByText("D")).toBeInTheDocument());

    const menu = await openMenu();

    expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Profile", "Appearance"]);
  });
});
