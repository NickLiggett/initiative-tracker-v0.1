import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { getCurrentUser } from "../api/documents";
import { DEFAULT_SETTINGS, lastUser, loadSettings, rememberUser, sanitizeSettings, saveSettings } from "./settings";
import { buildTheme } from "./theme";

/**
 * What the pages can ask for: the signed-in user's settings, who that is (null before the backend has said), and ways
 * to change them. Outside a provider these are the defaults, and changing them does nothing.
 */
const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  username: null,
  update: () => true,
  resetLook: () => true,
});

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Applies the signed-in user's colors and light or dark mode to everything inside it, and keeps their settings
 * (including their avatar picture). The last user's settings are used straight away, before the backend says who is
 * signed in, so the page doesn't flash the wrong colors.
 */
export function SettingsProvider({ children }) {
  const [username, setUsername] = useState(() => lastUser());
  const [settings, setSettings] = useState(() => loadSettings(lastUser()));
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  useEffect(() => {
    const controller = new AbortController();
    getCurrentUser({ signal: controller.signal })
      .then((me) => {
        if (me?.id != null && me.username) {
          rememberUser(me.username);
          setUsername(me.username);
          setSettings(loadSettings(me.username));
        }
      })
      .catch(() => {}); // not signed in, or no backend: the settings stay as they are
    return () => controller.abort();
  }, []);

  /** Changes some settings and keeps them. Returns false if the browser wouldn't keep them. */
  const update = useCallback(
    (changes) => {
      const next = sanitizeSettings({ ...settings, ...changes });
      setSettings(next);
      return saveSettings(username, next);
    },
    [settings, username],
  );

  /** Back to the default colors and mode; the avatar picture stays. */
  const resetLook = useCallback(
    () => update({ mode: DEFAULT_SETTINGS.mode, primary: DEFAULT_SETTINGS.primary, secondary: DEFAULT_SETTINGS.secondary }),
    [update],
  );

  const theme = useMemo(() => buildTheme(settings, prefersDark), [settings, prefersDark]);
  const value = useMemo(() => ({ settings, username, update, resetLook }), [settings, username, update, resetLook]);

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}
