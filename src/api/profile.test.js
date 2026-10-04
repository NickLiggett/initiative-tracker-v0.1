import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import { avatarUrl, deleteAvatar, getSettings, getTracker, saveSettings, saveTracker, uploadAvatar } from "./profile";

afterEach(() => vi.unstubAllGlobals());

const call = (fetchMock, index = 0) => ({ url: fetchMock.mock.calls[index][0], init: fetchMock.mock.calls[index][1] });

describe("settings", () => {
  it("are read and replaced at /api/me/settings, sending only the settings", async () => {
    const fetchMock = stubApi({
      "GET /api/me/settings": { mode: "dark", avatarVersion: null },
      "PUT /api/me/settings": (body) => body,
    });

    await expect(getSettings()).resolves.toEqual({ mode: "dark", avatarVersion: null });
    await saveSettings({ mode: "light", primary: "#112233", secondary: "#445566", avatarVersion: 7, avatar: "ignored" });

    expect(JSON.parse(call(fetchMock, 1).init.body)).toEqual({ mode: "light", primary: "#112233", secondary: "#445566" });
  });
});

describe("tracker", () => {
  it("is read and replaced at /api/me/tracker", async () => {
    const fetchMock = stubApi({ "GET /api/me/tracker": { round: 2 }, "PUT /api/me/tracker": (body) => body });

    await expect(getTracker()).resolves.toEqual({ round: 2 });
    await saveTracker({ combatants: [{ id: 1 }] });

    expect(call(fetchMock, 1).url).toBe("/api/me/tracker");
    expect(call(fetchMock, 1).init.method).toBe("PUT");
    expect(JSON.parse(call(fetchMock, 1).init.body)).toEqual({ combatants: [{ id: 1 }] });
  });
});

describe("avatar", () => {
  it("is sent as the picture itself, with its own type, not as JSON", async () => {
    const fetchMock = stubApi({ "PUT /api/me/avatar": { avatarVersion: 1759 } });
    const picture = new Blob(["pixels"], { type: "image/webp" });

    await expect(uploadAvatar(picture)).resolves.toEqual({ avatarVersion: 1759 });

    const { init } = call(fetchMock);
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(picture);
    expect(init.headers["Content-Type"]).toBe("image/webp");
  });

  it("is removed with a DELETE", async () => {
    const fetchMock = stubApi({ "DELETE /api/me/avatar": null });

    await deleteAvatar();

    expect(call(fetchMock).init.method).toBe("DELETE");
  });

  it("is found by username, and by version when that is known", () => {
    expect(avatarUrl("dev")).toBe("/api/users/dev/avatar");
    expect(avatarUrl("dev", 1759)).toBe("/api/users/dev/avatar?v=1759");
    expect(avatarUrl("dev", null)).toBe("/api/users/dev/avatar");
    expect(avatarUrl("a b/c")).toBe("/api/users/a%20b%2Fc/avatar");
  });
});
