import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings";
import { buildTheme } from "./theme";

describe("buildTheme", () => {
  it("uses the colors and mode chosen", () => {
    const theme = buildTheme({ ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32", secondary: "#8d6e63" });

    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.primary.main).toBe("#2e7d32");
    expect(theme.palette.secondary.main).toBe("#8d6e63");
  });

  it("uses the typeface and text size chosen, and MUI's own for the defaults", () => {
    const chosen = buildTheme({ ...DEFAULT_SETTINGS, font: "serif", textSize: "large" });
    expect(chosen.typography.fontFamily).toContain("Georgia");
    expect(chosen.typography.fontSize).toBe(16);

    const usual = buildTheme(DEFAULT_SETTINGS);
    expect(usual.typography.fontFamily).toContain("Roboto");
    expect(usual.typography.fontSize).toBe(14);
    expect(buildTheme({ font: "comic", textSize: "huge" }).typography.fontSize).toBe(14);
  });

  it("makes text readable on each main color", () => {
    const onYellow = buildTheme({ ...DEFAULT_SETTINGS, primary: "#ffeb3b" }).palette.primary.contrastText;
    const onNavy = buildTheme({ ...DEFAULT_SETTINGS, primary: "#1a237e" }).palette.primary.contrastText;

    expect(onYellow).not.toBe(onNavy); // dark text on yellow, white text on navy
  });

  it("follows the device for 'Match my device'", () => {
    expect(buildTheme({ ...DEFAULT_SETTINGS, mode: "system" }, true).palette.mode).toBe("dark");
    expect(buildTheme({ ...DEFAULT_SETTINGS, mode: "system" }, false).palette.mode).toBe("light");
    expect(buildTheme({ ...DEFAULT_SETTINGS, mode: "light" }, true).palette.mode).toBe("light");
  });

  it("falls back to the defaults for bad settings", () => {
    const theme = buildTheme({ mode: "neon", primary: "blue", secondary: null });

    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.primary.main).toBe(DEFAULT_SETTINGS.primary);
  });
});
