import { createTheme } from "@mui/material/styles";
import { sanitizeSettings } from "./settings";

/**
 * The site's theme for some settings. MUI works out the lighter and darker shades and a readable text color for each
 * main color.
 * @param {boolean} [systemPrefersDark] what "Match my device" means right now
 */
export function buildTheme(settings, systemPrefersDark = false) {
  const { mode, primary, secondary } = sanitizeSettings(settings);
  return createTheme({
    palette: {
      mode: mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode,
      primary: { main: primary },
      secondary: { main: secondary },
    },
  });
}
