import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setAuthTokenProvider } from "../../api/client";
import { AuthProvider } from "../../auth/AuthContext";
import AuthGate from "../../auth/AuthGate";
import { saveSession } from "../../auth/tokens";
import { makeJwt } from "../../test/jwt";
import LoginPage from "./LoginPage";

afterEach(() => {
  setAuthTokenProvider(null);
  window.history.replaceState({}, "", "/");
});

const CONFIG = { issuer: "http://localhost:8180/realms/open5e", clientId: "initiative-tracker", redirectUri: "http://localhost:3000/" };

function renderLogin(navigate = vi.fn()) {
  render(
    <AuthProvider config={CONFIG} navigate={navigate}>
      <LoginPage />
    </AuthProvider>,
  );
  return navigate;
}

describe("LoginPage", () => {
  it("offers to sign in, to create an account, and for someone who has forgotten their password", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: "Initiative Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create an account" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Forgot your password?" })).toBeEnabled();
  });

  it("sends the browser to the sign-in page", async () => {
    const navigate = renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/realms/open5e/protocol/openid-connect/auth");
  });

  it("sends the browser to the sign-up page", async () => {
    const navigate = renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/realms/open5e/protocol/openid-connect/registrations");
  });

  it("sends the browser to reset the password", () => {
    const navigate = renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));

    expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/realms/open5e/login-actions/reset-credentials");
  });

  it("can't be clicked again while the browser is on its way", async () => {
    const navigate = renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create an account" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Forgot your password?" })).toBeDisabled();
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });

  it("says why a sign-in didn't work", async () => {
    window.history.replaceState({}, "", "/?error=access_denied&error_description=User+cancelled&state=x");
    render(
      <AuthProvider config={CONFIG} navigate={vi.fn()}>
        <LoginPage />
      </AuthProvider>,
    );

    expect(await screen.findByText("Sign-in didn't finish: User cancelled.")).toBeInTheDocument();
  });
});

describe("AuthGate", () => {
  const gated = (config) => (
    <AuthProvider config={config} navigate={vi.fn()}>
      <AuthGate>
        <p>The app</p>
      </AuthGate>
    </AuthProvider>
  );

  it("shows the app when there is no sign-in set up, as in development", () => {
    render(gated(null));

    expect(screen.getByText("The app")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("shows the login page, and not the app, to someone who isn't signed in", async () => {
    render(gated(CONFIG));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("The app")).not.toBeInTheDocument();
  });

  it("shows the app to someone who is signed in", async () => {
    saveSession({ accessToken: "A", refreshToken: "R", idToken: makeJwt({ preferred_username: "dm" }), expiresAt: Date.now() + 600_000 });
    render(gated(CONFIG));

    expect(await screen.findByText("The app")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("shows neither while it finds out", () => {
    saveSession({ accessToken: "A", refreshToken: "R", idToken: null, expiresAt: Date.now() - 1000 });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // the renewal never answers
    render(gated(CONFIG));

    expect(screen.getByRole("progressbar", { name: "Signing in" })).toBeInTheDocument();
    expect(screen.queryByText("The app")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
