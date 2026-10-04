import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { getCurrentUser } from "../api/documents";
import { deleteAvatar, getSettings, saveSettings, uploadAvatar } from "../api/profile";
import {
  CHOSEN,
  DEFAULT_SETTINGS,
  cacheSettings,
  dataUrlToBlob,
  isDefaultLook,
  lastUser,
  legacyAvatar,
  loadCachedSettings,
  rememberUser,
  sanitizeSettings,
} from "./settings";
import { buildTheme } from "./theme";

/** How long to wait after the last change before sending the settings, so dragging a color doesn't send hundreds. */
const SAVE_DELAY_MS = 600;

/**
 * What the pages can ask for: the signed-in user's settings, who that is (null before the backend has said), and ways
 * to change them. Outside a provider these are the defaults, and changing them does nothing.
 */
const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  username: null,
  saveFailed: false,
  update: () => true,
  resetLook: () => true,
  setAvatar: async () => null,
  removeAvatar: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Applies the signed-in user's colors and light or dark mode to everything inside it, and keeps their settings and
 * avatar picture on their account, so they follow them to other browsers. A copy is kept in this browser, which is
 * used straight away, before the backend says who is signed in, so the page doesn't flash the wrong colors.
 */
export function SettingsProvider({ children }) {
  const [username, setUsername] = useState(() => lastUser());
  const [signedIn, setSignedIn] = useState(false);
  const [settings, setSettings] = useState(() => loadCachedSettings(lastUser()));
  const [saveFailed, setSaveFailed] = useState(false);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  // The latest values, for the functions below to use without being remade (and the timer to see) on every change.
  const latest = useRef({ settings, username, signedIn });
  latest.current = { settings, username, signedIn };
  const timer = useRef(null);
  const unsent = useRef(null);

  /** Sends any settings waiting to go to the account. */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    const waiting = unsent.current;
    unsent.current = null;
    if (waiting) {
      try {
        await saveSettings(waiting);
        setSaveFailed(false);
      } catch {
        setSaveFailed(true); // still kept in this browser
      }
    }
  }, []);

  // Settings changed just before the provider goes away are still sent.
  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      let me;
      try {
        me = await getCurrentUser({ signal });
      } catch {
        return; // no backend: the settings in this browser stay as they are
      }
      if (me?.id == null || !me.username) {
        return; // nobody signed in
      }
      rememberUser(me.username);
      setUsername(me.username);
      setSignedIn(true);
      const cached = loadCachedSettings(me.username);
      // Read before the copy in this browser is written again, which leaves the old picture out.
      const picture = dataUrlToBlob(legacyAvatar(me.username));
      setSettings(cached);

      let account;
      try {
        account = await getSettings({ signal });
      } catch {
        return;
      }
      if (CHOSEN.some((name) => account[name] !== undefined) || account.avatarVersion != null) {
        const next = sanitizeSettings(account);
        setSettings(next);
        cacheSettings(me.username, next);
        return;
      }

      // The account has no picture, whatever this browser last heard (it may have been removed somewhere else).
      const withoutPicture = { ...cached, avatarVersion: null };
      setSettings(withoutPicture);
      cacheSettings(me.username, withoutPicture);

      // The account has nothing else either. What this browser has (colors chosen before settings lived on the
      // account, or changes that couldn't be sent) is the user's, so it goes to the account now.
      if (isDefaultLook(cached) && !picture) {
        return;
      }
      try {
        await saveSettings(withoutPicture);
        const avatarVersion = picture ? (await uploadAvatar(picture)).avatarVersion : null;
        const next = { ...withoutPicture, avatarVersion };
        setSettings(next);
        cacheSettings(me.username, next);
      } catch {
        // it is still here, and goes next time
      }
    })();

    return () => controller.abort();
  }, []);

  /** Stores the settings in this browser; true if the browser would keep them. */
  const keep = (next) => {
    setSettings(next);
    return cacheSettings(latest.current.username, next);
  };

  /** Changes some settings, at once, and sends the colors and mode to the account a moment later. */
  const update = useCallback(
    (changes) => {
      const { settings: current, signedIn: known } = latest.current;
      const next = sanitizeSettings({ ...current, ...changes });
      const kept = keep(next);
      if (known && CHOSEN.some((name) => next[name] !== current[name])) {
        unsent.current = next;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
      }
      return kept;
    },
    [flush], // the rest is read from `latest`, so this function stays the same
  );

  /** Back to the default colors and mode; the avatar picture stays. */
  const resetLook = useCallback(
    () => update({ mode: DEFAULT_SETTINGS.mode, primary: DEFAULT_SETTINGS.primary, secondary: DEFAULT_SETTINGS.secondary }),
    [update],
  );

  /** Makes the picture the user's avatar on their account. Rejects if the account wouldn't take it. */
  const setAvatar = useCallback(async (picture) => {
    const { avatarVersion } = await uploadAvatar(picture);
    keep({ ...latest.current.settings, avatarVersion });
    return avatarVersion;
  }, []);

  const removeAvatar = useCallback(async () => {
    await deleteAvatar();
    keep({ ...latest.current.settings, avatarVersion: null });
  }, []);

  const theme = useMemo(() => buildTheme(settings, prefersDark), [settings, prefersDark]);
  const value = useMemo(
    () => ({ settings, username, saveFailed, update, resetLook, setAvatar, removeAvatar }),
    [settings, username, saveFailed, update, resetLook, setAvatar, removeAvatar],
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}
