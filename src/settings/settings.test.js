import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLOR_PRESETS,
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

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("sanitizeSettings", () => {
  it("keeps good settings, with colors normalized", () => {
    expect(sanitizeSettings({ mode: "dark", primary: "#ABCDEF", secondary: "123", avatarVersion: 1759 })).toEqual({
      mode: "dark",
      primary: "#abcdef",
      secondary: "#112233",
      avatarVersion: 1759,
    });
  });

  it("replaces anything missing or not allowed with the default", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("nonsense")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ mode: "neon", primary: "blue", secondary: 5, avatarVersion: "soon" })).toEqual(DEFAULT_SETTINGS);
  });

  it("takes an avatar version that is a whole number from 0 up, and nothing else", () => {
    expect(sanitizeSettings({ avatarVersion: 0 }).avatarVersion).toBe(0);
    expect(sanitizeSettings({ avatarVersion: 12.9 }).avatarVersion).toBe(12);
    for (const bad of [-1, NaN, Infinity, "12", null, undefined, {}]) {
      expect(sanitizeSettings({ avatarVersion: bad }).avatarVersion).toBeNull();
    }
  });

  it("drops a picture kept the old way, in the settings", () => {
    expect(sanitizeSettings({ avatar: "data:image/png;base64,AAAA" })).toEqual(DEFAULT_SETTINGS);
  });

  it("offers presets that are all fit to use", () => {
    for (const { primary, secondary } of COLOR_PRESETS) {
      expect(sanitizeSettings({ primary, secondary })).toMatchObject({ primary, secondary });
    }
    expect(COLOR_PRESETS[0]).toMatchObject({ primary: DEFAULT_SETTINGS.primary, secondary: DEFAULT_SETTINGS.secondary });
  });
});

describe("isDefaultLook", () => {
  it("is about the colors and mode, not the picture", () => {
    expect(isDefaultLook(DEFAULT_SETTINGS)).toBe(true);
    expect(isDefaultLook({ ...DEFAULT_SETTINGS, avatarVersion: 5 })).toBe(true);
    expect(isDefaultLook({ ...DEFAULT_SETTINGS, mode: "dark" })).toBe(false);
    expect(isDefaultLook({ ...DEFAULT_SETTINGS, primary: "#000000" })).toBe(false);
  });
});

describe("the copy kept in this browser", () => {
  it("gives back what was kept, for that username only", () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32", avatarVersion: 7 });
    cacheSettings("player", { ...DEFAULT_SETTINGS, secondary: "#00acc1" });

    expect(loadCachedSettings("dev")).toMatchObject({ mode: "dark", primary: "#2e7d32", avatarVersion: 7 });
    expect(loadCachedSettings("player")).toMatchObject({ mode: "light", secondary: "#00acc1", avatarVersion: null });
    expect(loadCachedSettings("someone-else")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps settings for nobody in particular under a guest", () => {
    cacheSettings(null, { ...DEFAULT_SETTINGS, mode: "dark" });

    expect(loadCachedSettings(undefined).mode).toBe("dark");
    expect(loadCachedSettings("guest").mode).toBe("dark");
  });

  it("uses the defaults when what was kept is damaged", () => {
    window.localStorage.setItem("initiative-tracker.settings.dev", "{not json");
    expect(loadCachedSettings("dev")).toEqual(DEFAULT_SETTINGS);

    window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ mode: "dark", primary: "nope" }));
    expect(loadCachedSettings("dev")).toEqual({ ...DEFAULT_SETTINGS, mode: "dark" });
  });

  it("says when the browser will not keep them, and still reads fine", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(cacheSettings("dev", DEFAULT_SETTINGS)).toBe(false);
    expect(loadCachedSettings("dev")).toEqual(DEFAULT_SETTINGS);
    expect(legacyAvatar("dev")).toBeNull();
    expect(lastUser()).toBeNull();
    expect(() => rememberUser("dev")).not.toThrow();
  });

  it("remembers who was signed in last", () => {
    expect(lastUser()).toBeNull();
    rememberUser("dev");
    expect(lastUser()).toBe("dev");
  });
});

describe("a picture kept in this browser by an earlier version", () => {
  it("is found for the username, if it's a picture", () => {
    window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ mode: "dark", avatar: "data:image/webp;base64,AAAA" }));

    expect(legacyAvatar("dev")).toBe("data:image/webp;base64,AAAA");
    expect(legacyAvatar("player")).toBeNull();
  });

  it("isn't there once the settings have been kept again", () => {
    window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ avatar: "data:image/webp;base64,AAAA" }));
    cacheSettings("dev", DEFAULT_SETTINGS);

    expect(legacyAvatar("dev")).toBeNull();
  });

  it("isn't taken from anything that is not a picture", () => {
    for (const avatar of ["https://example.com/me.png", "data:text/html;base64,AAAA", 5, null]) {
      window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ avatar }));
      expect(legacyAvatar("dev")).toBeNull();
    }
    window.localStorage.setItem("initiative-tracker.settings.dev", "{broken");
    expect(legacyAvatar("dev")).toBeNull();
  });
});

describe("dataUrlToBlob", () => {
  it("turns a picture written as a data URL back into one", async () => {
    const blob = dataUrlToBlob("data:image/PNG;base64,iVBORw0K"); // "‰PNG\r\n" and a bit

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(6);
    expect(new Uint8Array(await blob.arrayBuffer())[1]).toBe(0x50); // P
  });

  it("is null for anything else", () => {
    for (const bad of [null, undefined, "", "https://example.com/a.png", "data:text/plain;base64,AAAA", "data:image/png,raw", "data:image/png;base64,***"]) {
      expect(dataUrlToBlob(bad)).toBeNull();
    }
  });
});
