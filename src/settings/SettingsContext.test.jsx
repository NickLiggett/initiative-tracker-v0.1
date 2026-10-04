import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";
import { stubApi } from "../test/fakeApi";
import UserAvatar from "../components/layout/UserAvatar";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser } from "./settings";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.matchMedia;
});

/** Shows what the settings and theme are, and lets a test change them. */
let latest;
function Probe() {
  const theme = useTheme();
  latest = useSettings();
  return (
    <p data-testid="probe">
      {theme.palette.mode}|{theme.palette.primary.main}|{theme.palette.secondary.main}|{latest.username ?? "nobody"}|
      {latest.settings.avatarVersion ?? "none"}
    </p>
  );
}
const probe = () => screen.getByTestId("probe").textContent;

/** The backend with the user signed in as `dev` and these settings on their account (none, by default). */
function stubBackend({ account = { avatarVersion: null }, me = { id: 1, username: "dev" }, extra = {} } = {}) {
  return stubApi({
    "GET /api/me": me,
    "GET /api/me/settings": account,
    "PUT /api/me/settings": (body) => ({ ...body, avatarVersion: account.avatarVersion ?? null }),
    "PUT /api/me/avatar": { avatarVersion: 1759 },
    "DELETE /api/me/avatar": null,
    ...extra,
  });
}

const requests = (fetchMock, route) =>
  fetchMock.mock.calls.filter(([url, init = {}]) => `${init.method ?? "GET"} ${url.split("?")[0]}` === route);

async function renderProvider(children = <Probe />) {
  render(<SettingsProvider>{children}</SettingsProvider>);
}

/** Waits until the provider knows who is signed in and has asked the account for the settings. */
const settled = async (fetchMock) => {
  await waitFor(() => expect(probe()).toContain("|dev|"));
  await waitFor(() => expect(requests(fetchMock, "GET /api/me/settings")).toHaveLength(1));
  await act(async () => {}); // let what the answer sets happen
};

describe("loading", () => {
  it("uses the defaults when nothing has been chosen anywhere, and sends nothing", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|none");
    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(0);
    expect(requests(fetchMock, "PUT /api/me/avatar")).toHaveLength(0);
  });

  it("uses the copy in this browser straight away, before the backend has said who is signed in", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32", avatarVersion: 4 });
    rememberUser("dev");
    stubApi({}); // the backend isn't answering
    await renderProvider();

    expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev|4");
  });

  it("takes the settings from the account, and keeps a copy in this browser", async () => {
    const fetchMock = stubBackend({ account: { mode: "dark", primary: "#2e7d32", avatarVersion: 1759 } });
    await renderProvider();
    await settled(fetchMock);

    expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev|1759");
    expect(loadCachedSettings("dev")).toMatchObject({ mode: "dark", primary: "#2e7d32", avatarVersion: 1759 });
  });

  it("prefers the account to the copy in this browser", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "light", primary: "#c2185b" });
    rememberUser("dev");
    const fetchMock = stubBackend({ account: { mode: "dark", primary: "#2e7d32", avatarVersion: null } });
    await renderProvider();
    await settled(fetchMock);

    expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev|none");
    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(0); // the account wins; nothing is sent
  });

  it("forgets a picture this browser remembers if the account has none, as when it was removed somewhere else", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, avatarVersion: 1759 });
    rememberUser("dev");
    const fetchMock = stubBackend();
    await renderProvider();
    expect(probe()).toContain("|1759"); // until the account has said otherwise
    await settled(fetchMock);

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|none");
    expect(loadCachedSettings("dev").avatarVersion).toBeNull();
  });

  it("finds settings on a browser that has never seen the user", async () => {
    const fetchMock = stubBackend({ account: { mode: "dark", secondary: "#00acc1", avatarVersion: null } });
    await renderProvider();
    await settled(fetchMock);

    expect(probe()).toBe("dark|#1976d2|#00acc1|dev|none");
  });

  it("switches to whoever the backend says is signed in", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, primary: "#2e7d32" });
    rememberUser("dev");
    stubBackend({ me: { id: 2, username: "player" }, account: { primary: "#c2185b", avatarVersion: null } });
    await renderProvider();

    await waitFor(() => expect(probe()).toBe("light|#c2185b|#ab47bc|player|none"));
    expect(loadCachedSettings("dev").primary).toBe("#2e7d32"); // theirs is left alone
  });

  it("keeps the copy in this browser when nobody is signed in, and doesn't ask for settings", async () => {
    cacheSettings("guest", { ...DEFAULT_SETTINGS, primary: "#2e7d32" });
    const fetchMock = stubBackend({ me: { username: "anonymous" } });
    await renderProvider();

    await waitFor(() => expect(requests(fetchMock, "GET /api/me")).toHaveLength(1));
    await act(async () => {});
    expect(probe()).toBe("light|#2e7d32|#ab47bc|nobody|none");
    expect(requests(fetchMock, "GET /api/me/settings")).toHaveLength(0);
  });

  it("keeps the copy in this browser when the account can't be asked", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, primary: "#2e7d32" });
    rememberUser("dev");
    stubApi({ "GET /api/me": { id: 1, username: "dev" } }); // no settings route: a 404
    await renderProvider();

    await act(async () => {});
    expect(probe()).toBe("light|#2e7d32|#ab47bc|dev|none");
  });
});

describe("changing settings", () => {
  it("applies a change at once and keeps it in this browser", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    let kept;
    act(() => {
      kept = latest.update({ mode: "dark", primary: "#5e35b1" });
    });

    expect(kept).toBe(true);
    expect(probe()).toBe("dark|#5e35b1|#ab47bc|dev|none");
    expect(loadCachedSettings("dev")).toMatchObject({ mode: "dark", primary: "#5e35b1" });
  });

  it("sends the colors and mode to the account a moment later, once, with the last values", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    act(() => {
      latest.update({ primary: "#111111" });
      latest.update({ primary: "#222222" });
    });
    act(() => {
      latest.update({ primary: "#333333", mode: "dark" });
    });
    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(0); // not yet

    await waitFor(() => expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(1), { timeout: 3000 });
    expect(JSON.parse(requests(fetchMock, "PUT /api/me/settings")[0][1].body)).toEqual({
      mode: "dark",
      primary: "#333333",
      secondary: "#ab47bc",
    });
  });

  it("still sends a change when the provider goes away straight after it", async () => {
    const fetchMock = stubBackend();
    const { unmount } = render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await settled(fetchMock);
    act(() => {
      latest.update({ mode: "dark" });
    });

    unmount();

    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(1);
  });

  it("sends nothing when nobody is signed in", async () => {
    const fetchMock = stubBackend({ me: { username: "anonymous" } });
    await renderProvider();
    await waitFor(() => expect(requests(fetchMock, "GET /api/me")).toHaveLength(1));
    await act(async () => {});

    act(() => {
      latest.update({ mode: "dark" });
    });

    expect(probe()).toBe("dark|#1976d2|#ab47bc|nobody|none");
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(0);
  });

  it("says when the account wouldn't take them, keeps them here, and says no more once they're sent", async () => {
    let accepting = false;
    const fetchMock = stubBackend({
      extra: { "PUT /api/me/settings": (body) => (accepting ? body : new Response("{}", { status: 500 })) },
    });
    await renderProvider();
    await settled(fetchMock);

    act(() => {
      latest.update({ mode: "dark" });
    });
    await waitFor(() => expect(latest.saveFailed).toBe(true), { timeout: 3000 });
    expect(probe()).toContain("dark|"); // still in use
    expect(loadCachedSettings("dev").mode).toBe("dark");

    accepting = true;
    act(() => {
      latest.update({ mode: "light" });
    });
    await waitFor(() => expect(latest.saveFailed).toBe(false), { timeout: 3000 });
  });

  it("says when the browser won't keep a change", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    let kept;
    act(() => {
      kept = latest.update({ primary: "#2e7d32" });
    });

    expect(kept).toBe(false);
    expect(probe()).toBe("light|#2e7d32|#ab47bc|dev|none");
  });

  it("ignores a setting that isn't allowed", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    act(() => {
      latest.update({ primary: "not a color", mode: "neon" });
    });

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|none");
  });

  it("resets the colors and mode but keeps the picture", async () => {
    const fetchMock = stubBackend({ account: { mode: "dark", primary: "#5e35b1", secondary: "#00acc1", avatarVersion: 1759 } });
    await renderProvider();
    await settled(fetchMock);
    expect(probe()).toBe("dark|#5e35b1|#00acc1|dev|1759");

    act(() => {
      latest.resetLook();
    });

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|1759");
    await waitFor(() => expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(1), { timeout: 3000 });
  });

  it("follows the device when the mode is 'Match my device'", async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("dark"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "system" });
    rememberUser("dev");
    stubApi({});
    await renderProvider();

    expect(probe()).toBe("dark|#1976d2|#ab47bc|dev|none");
  });
});

describe("the avatar picture", () => {
  it("is uploaded to the account, and its version is kept", async () => {
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);
    const picture = new Blob(["pixels"], { type: "image/webp" });

    let version;
    await act(async () => {
      version = await latest.setAvatar(picture);
    });

    expect(version).toBe(1759);
    expect(requests(fetchMock, "PUT /api/me/avatar")[0][1].body).toBe(picture);
    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|1759");
    expect(loadCachedSettings("dev").avatarVersion).toBe(1759);
  });

  it("is left as it was if the account wouldn't take it", async () => {
    const fetchMock = stubBackend({
      account: { primary: "#2e7d32", avatarVersion: 5 },
      extra: { "PUT /api/me/avatar": () => new Response(JSON.stringify({ detail: "An avatar can be 512 KB at most" }), { status: 413 }) },
    });
    await renderProvider();
    await settled(fetchMock);

    await act(async () => {
      await expect(latest.setAvatar(new Blob(["x"], { type: "image/png" }))).rejects.toThrow("512 KB at most");
    });

    expect(probe()).toBe("light|#2e7d32|#ab47bc|dev|5");
  });

  it("is removed from the account", async () => {
    const fetchMock = stubBackend({ account: { avatarVersion: 5 } });
    await renderProvider();
    await settled(fetchMock);

    await act(async () => {
      await latest.removeAvatar();
    });

    expect(requests(fetchMock, "DELETE /api/me/avatar")).toHaveLength(1);
    expect(probe()).toBe("light|#1976d2|#ab47bc|dev|none");
  });

  it("stays when it can't be removed", async () => {
    const fetchMock = stubBackend({ account: { avatarVersion: 5 }, extra: { "DELETE /api/me/avatar": () => new Response("{}", { status: 500 }) } });
    await renderProvider();
    await settled(fetchMock);

    await act(async () => {
      await expect(latest.removeAvatar()).rejects.toThrow();
    });

    expect(probe()).toContain("|5");
  });
});

describe("settings an earlier version kept only in this browser", () => {
  it("move to the account the first time, when the account has none", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32" });
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    await waitFor(() => expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(1));
    expect(JSON.parse(requests(fetchMock, "PUT /api/me/settings")[0][1].body)).toEqual({
      mode: "dark",
      primary: "#2e7d32",
      secondary: "#ab47bc",
    });
    expect(requests(fetchMock, "PUT /api/me/avatar")).toHaveLength(0);
    expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev|none");
  });

  it("include a picture, which is uploaded and then no longer kept here", async () => {
    window.localStorage.setItem(
      "initiative-tracker.settings.dev",
      JSON.stringify({ mode: "dark", primary: "#2e7d32", avatar: "data:image/png;base64,iVBORw0K" }),
    );
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    await waitFor(() => expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev|1759"));
    const [, init] = requests(fetchMock, "PUT /api/me/avatar")[0];
    expect(init.body).toBeInstanceOf(Blob);
    expect(init.body.type).toBe("image/png");
    expect(window.localStorage.getItem("initiative-tracker.settings.dev")).not.toContain("data:image");
    expect(loadCachedSettings("dev").avatarVersion).toBe(1759);
  });

  it("move a picture alone, even if the colors were never changed", async () => {
    window.localStorage.setItem("initiative-tracker.settings.dev", JSON.stringify({ avatar: "data:image/png;base64,iVBORw0K" }));
    const fetchMock = stubBackend();
    await renderProvider();
    await settled(fetchMock);

    await waitFor(() => expect(probe()).toContain("|1759"));
    expect(requests(fetchMock, "PUT /api/me/avatar")).toHaveLength(1);
  });

  it("are not sent when the account already has settings", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark" });
    const fetchMock = stubBackend({ account: { primary: "#2e7d32", avatarVersion: null } });
    await renderProvider();
    await settled(fetchMock);

    expect(probe()).toBe("light|#2e7d32|#ab47bc|dev|none"); // the account's, not the old copy's
    expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(0);
  });

  it("stay here, and are tried again next time, if the account wouldn't take them", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark" });
    const fetchMock = stubBackend({ extra: { "PUT /api/me/settings": () => new Response("{}", { status: 500 }) } });
    await renderProvider();
    await settled(fetchMock);

    await waitFor(() => expect(requests(fetchMock, "PUT /api/me/settings")).toHaveLength(1));
    expect(probe()).toBe("dark|#1976d2|#ab47bc|dev|none");
    expect(loadCachedSettings("dev").mode).toBe("dark");
  });
});

describe("without a provider", () => {
  it("gives the defaults, and changing them does nothing", async () => {
    render(<Probe />);

    expect(probe()).toBe("light|#1976d2|#9c27b0|nobody|none"); // no ThemeProvider either, so MUI's own default theme
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.update({ mode: "dark" })).toBe(true);
    await expect(latest.setAvatar(new Blob())).resolves.toBeNull();
    expect(loadCachedSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("UserAvatar", () => {
  it("shows the user's own picture from their account, by version", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS, avatarVersion: 1759 });
    rememberUser("dev");
    stubApi({});
    render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );

    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", "/api/users/dev/avatar?v=1759");
  });

  it("shows the first letter of the username when the user has no picture", async () => {
    rememberUser("dev");
    stubApi({});
    render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );

    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries to show another user's picture, and has their letter to fall back on", async () => {
    rememberUser("dev");
    stubApi({});
    render(
      <SettingsProvider>
        <UserAvatar username="player" />
      </SettingsProvider>,
    );

    expect(screen.getByRole("img", { name: "player's picture" })).toHaveAttribute("src", "/api/users/player/avatar");
  });

  it("is a plain person when we don't know who", async () => {
    stubApi({});
    render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );

    expect(screen.getByTestId("PersonIcon")).toBeInTheDocument();
  });
});
