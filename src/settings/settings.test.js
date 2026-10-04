import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLOR_PRESETS,
  DEFAULT_SETTINGS,
  MAX_AVATAR_CHARS,
  lastUser,
  loadSettings,
  rememberUser,
  sanitizeSettings,
  saveSettings,
} from "./settings";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("sanitizeSettings", () => {
  it("keeps good settings, with colors normalized", () => {
    const avatar = "data:image/webp;base64,AAAA";

    expect(sanitizeSettings({ mode: "dark", primary: "#ABCDEF", secondary: "123", avatar })).toEqual({
      mode: "dark",
      primary: "#abcdef",
      secondary: "#112233",
      avatar,
    });
  });

  it("replaces anything missing or not allowed with the default", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("nonsense")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ mode: "neon", primary: "blue", secondary: 5, avatar: 12 })).toEqual(DEFAULT_SETTINGS);
  });

  it("only takes an avatar that is a small enough picture", () => {
    expect(sanitizeSettings({ avatar: "https://example.com/me.png" }).avatar).toBeNull();
    expect(sanitizeSettings({ avatar: "data:text/html;base64,AAAA" }).avatar).toBeNull();
    expect(sanitizeSettings({ avatar: "data:image/png;base64," + "A".repeat(MAX_AVATAR_CHARS) }).avatar).toBeNull();
  });

  it("offers presets that are all fit to use", () => {
    for (const { primary, secondary } of COLOR_PRESETS) {
      expect(sanitizeSettings({ primary, secondary })).toMatchObject({ primary, secondary });
    }
    expect(COLOR_PRESETS[0]).toMatchObject({ primary: DEFAULT_SETTINGS.primary, secondary: DEFAULT_SETTINGS.secondary });
  });
});

describe("keeping settings", () => {
  it("gives back what was kept, for that username only", () => {
    saveSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32" });
    saveSettings("player", { ...DEFAULT_SETTINGS, secondary: "#00acc1" });

    expect(loadSettings("dev")).toMatchObject({ mode: "dark", primary: "#2e7d32", secondary: DEFAULT_SETTINGS.secondary });
    expect(loadSettings("player")).toMatchObject({ mode: "light", secondary: "#00acc1" });
    expect(loadSettings("someone-else")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps settings for nobody in particular under a guest", () => {
    saveSettings(null, { ...DEFAULT_SETTINGS, mode: "dark" });

    expect(loadSettings(undefined).mode).toBe("dark");
    expect(loadSettings("guest").mode).toBe("dark");
  });

  it("uses the defaults when what was kept is damaged", () => {
    window.localStorage.setItem("initiative-tracker.settings.dev", "{not json");
    expect(loadSettings("dev")).toEqual(DEFAULT_SETTINGS);

    window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ mode: "dark", primary: "nope" }));
    expect(loadSettings("dev")).toEqual({ ...DEFAULT_SETTINGS, mode: "dark" });
  });

  it("says when the browser will not keep them, and still reads fine", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(saveSettings("dev", DEFAULT_SETTINGS)).toBe(false);
    expect(loadSettings("dev")).toEqual(DEFAULT_SETTINGS);
    expect(lastUser()).toBeNull();
    expect(() => rememberUser("dev")).not.toThrow();
  });

  it("remembers who was signed in last", () => {
    expect(lastUser()).toBeNull();
    rememberUser("dev");
    expect(lastUser()).toBe("dev");
  });
});
