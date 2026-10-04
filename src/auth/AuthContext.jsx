import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setAuthTokenProvider } from "../api/client";
import { AuthError, accountUrl, authorizationUrl, exchangeCode, logoutUrl, readAuthConfig, refreshTokens, resetPasswordUrl } from "./oidc";
import { createPkce, randomString } from "./pkce";
import {
  clearPending,
  clearSession,
  loadPending,
  loadSession,
  parseJwt,
  saveSession,
  savePending,
  secondsLeft,
  toSession,
  userOf,
} from "./tokens";

/** Renew the tokens this long before they stop working. */
const REFRESH_EARLY_SECONDS = 60;
/** A token with less left than this is renewed before it is used. */
const NEARLY_EXPIRED_SECONDS = 30;
/** How long to wait to try again when the sign-in service can't be reached. */
const RETRY_SECONDS = 30;

/**
 * Whether and who is signed in. `status` is:
 * - "disabled": the app has no sign-in configured (development, with the backend's `X-User` header)
 * - "loading": finding out
 * - "signedOut": show the login page; `error` says why if a sign-in failed or a session ended
 * - "signedIn": `user` is `{username, name, email}`
 */
const AuthContext = createContext({
  status: "disabled",
  user: null,
  error: null,
  accountUrl: null,
  signIn: () => {},
  register: () => {},
  forgotPassword: () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Signs the user in by OpenID Connect (authorization code flow with PKCE) and gives the API client their token.
 * @param {?object} [config] where to sign in (see `readAuthConfig`); null for no sign-in. From the environment if left out.
 * @param {(url: string) => void} [navigate] how to send the browser to another address
 */
export function AuthProvider({ children, config, navigate = (url) => window.location.assign(url) }) {
  const [settings] = useState(() => (config === undefined ? readAuthConfig() : config));
  const [status, setStatus] = useState(settings ? "loading" : "disabled");
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const session = useRef(null);
  const refreshing = useRef(null);
  const timer = useRef(null);
  const started = useRef(false);
  const signedInBefore = useRef(false); // whether this page has had a working session yet

  /** Signed in with these tokens (from a sign-in, a reload or a renewal). */
  const adopt = useCallback((next) => {
    session.current = next;
    signedInBefore.current = true;
    saveSession(next);
    setUser(userOf(next));
    setError(null);
    setStatus("signedIn");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void refresh(), Math.max(5, secondsLeft(next) - REFRESH_EARLY_SECONDS) * 1000);
    // `refresh` is defined below and is only called later, when the timer goes off.
  }, []);

  /** Signed out, with a reason if there is one. */
  const endSession = useCallback((reason = null) => {
    session.current = null;
    clearSession();
    clearTimeout(timer.current);
    setUser(null);
    setError(reason);
    setStatus("signedOut");
  }, []);

  /** Gets new tokens with the refresh token. One request however many ask at once. */
  const refresh = useCallback(() => {
    if (refreshing.current) {
      return refreshing.current;
    }
    const current = session.current;
    if (!current?.refreshToken) {
      endSession("Your session ended. Sign in again.");
      return Promise.resolve(null);
    }
    refreshing.current = refreshTokens(settings, current.refreshToken)
      .then((tokens) => {
        const next = toSession(tokens);
        next.refreshToken ??= current.refreshToken;
        next.idToken ??= current.idToken;
        adopt(next);
        return next;
      })
      .catch((e) => {
        if (e instanceof AuthError && e.code === "unreachable") {
          // Nothing is wrong with the session; the service isn't answering.
          if (!signedInBefore.current) {
            // Opening the page: there is no working session to carry on with. The tokens are kept for a reload.
            setError("Couldn't reach the sign-in service. Try again in a moment.");
            setStatus("signedOut");
            return null;
          }
          // Already signed in: carry on, and try again soon.
          clearTimeout(timer.current);
          timer.current = setTimeout(() => void refresh(), RETRY_SECONDS * 1000);
          return current;
        }
        endSession("Your session ended. Sign in again.");
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [settings, adopt, endSession]);

  /** The access token to send with a request, renewed first if it is about to stop working. Null if signed out. */
  const getAccessToken = useCallback(async () => {
    const current = session.current;
    if (!current) {
      return null;
    }
    if (secondsLeft(current) > NEARLY_EXPIRED_SECONDS) {
      return current.accessToken;
    }
    return (await refresh())?.accessToken ?? null;
  }, [refresh]);

  /** Back from the provider with a code (or an error): check it is the sign-in we started, and collect the tokens. */
  const finishSignIn = useCallback(
    async ({ code, state, failure, description }) => {
      const pending = loadPending();
      clearPending();
      if (failure) {
        endSession(`Sign-in didn't finish: ${description || failure}.`);
        return;
      }
      if (!pending || pending.state !== state) {
        endSession("That sign-in wasn't started here, or was started again since. Try signing in again.");
        return;
      }
      try {
        const tokens = await exchangeCode(settings, code, pending.verifier);
        const claims = parseJwt(tokens.id_token ?? "");
        const audiences = [].concat(claims?.aud ?? []);
        if (claims && (claims.nonce !== pending.nonce || claims.iss !== settings.issuer || !audiences.includes(settings.clientId))) {
          throw new AuthError("The sign-in answer wasn't meant for this app.", "mismatch");
        }
        adopt(toSession(tokens));
      } catch (e) {
        endSession(e instanceof AuthError ? e.message : "Sign-in failed. Try again.");
      }
    },
    [settings, adopt, endSession],
  );

  useEffect(() => {
    if (!settings || started.current) {
      return;
    }
    started.current = true; // React runs effects twice in development; a sign-in must only be finished once

    const url = new URL(window.location.href);
    const returned = {
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      failure: url.searchParams.get("error"),
      description: url.searchParams.get("error_description"),
    };
    if (returned.code || returned.failure) {
      // Take the code out of the address, so that reloading doesn't try to use it again.
      ["code", "state", "session_state", "iss", "error", "error_description"].forEach((name) => url.searchParams.delete(name));
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      void finishSignIn(returned);
      return;
    }

    const stored = loadSession();
    if (!stored) {
      setStatus("signedOut");
    } else if (secondsLeft(stored) > NEARLY_EXPIRED_SECONDS) {
      adopt(stored);
    } else {
      session.current = stored;
      void refresh();
    }
  }, [settings, adopt, refresh, finishSignIn]);

  // The API client takes the token from here for every request.
  useEffect(() => {
    if (!settings) {
      return undefined;
    }
    setAuthTokenProvider(getAccessToken);
    return () => setAuthTokenProvider(null);
  }, [settings, getAccessToken]);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Sends the browser to the provider to sign in, or, with `register`, to sign up. */
  const begin = useCallback(
    async ({ register = false } = {}) => {
      const { verifier, challenge } = await createPkce();
      const state = randomString(16);
      const nonce = randomString(16);
      savePending({ state, verifier, nonce });
      navigate(authorizationUrl(settings, { challenge, state, nonce }, { register }));
    },
    [settings, navigate],
  );

  const value = useMemo(() => {
    if (!settings) {
      // No sign-in set up, so there is nothing to sign in to or out of.
      const nothing = () => {};
      return { status, user: null, error: null, accountUrl: null, signIn: nothing, register: nothing, forgotPassword: nothing, signOut: nothing };
    }
    return {
      status,
      user,
      error,
      accountUrl: accountUrl(settings),
      signIn: () => begin(),
      register: () => begin({ register: true }),
      forgotPassword: () => navigate(resetPasswordUrl(settings)),
      signOut: () => {
        const idToken = session.current?.idToken;
        endSession();
        navigate(logoutUrl(settings, idToken));
      },
    };
  }, [status, user, error, settings, begin, navigate, endSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
