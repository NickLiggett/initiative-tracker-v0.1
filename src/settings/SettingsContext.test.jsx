import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";
import { stubApi } from "../test/fakeApi";
import UserAvatar from "../components/layout/UserAvatar";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { DEFAULT_SETTINGS, loadSettings, rememberUser, saveSettings } from "./settings";

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

const AVATAR = "data:image/webp;base64,AAAA";

/** Shows what the settings and theme are, and lets a test change them. */
let latest;
function Probe() {
  const theme = useTheme();
  latest = useSettings();
  return (
    <p data-testid="probe">
      {theme.palette.mode}|{theme.palette.primary.main}|{theme.palette.secondary.main}|{latest.username ?? "nobody"}
    </p>
  );
}
const probe = () => screen.getByTestId("probe").textContent;

const signedInAs = (username, id = 1) => stubApi({ "GET /api/me": { id, username } });

describe("SettingsProvider", () => {
  it("uses the defaults when nothing has been kept", async () => {
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(probe()).toBe("light|#1976d2|#ab47bc|dev"));
  });

  it("uses the last user's settings straight away, before the backend has said who is signed in", async () => {
    saveSettings("dev", { ...DEFAULT_SETTINGS, mode: "dark", primary: "#2e7d32" });
    rememberUser("dev");
    stubApi({}); // the backend isn't answering
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    expect(probe()).toBe("dark|#2e7d32|#ab47bc|dev");
  });

  it("switches to the settings of whoever the backend says is signed in", async () => {
    saveSettings("dev", { ...DEFAULT_SETTINGS, primary: "#2e7d32" });
    saveSettings("player", { ...DEFAULT_SETTINGS, primary: "#c2185b" });
    rememberUser("dev");
    signedInAs("player", 2);
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(probe()).toBe("light|#c2185b|#ab47bc|player"));
  });

  it("keeps the settings as they are when nobody is signed in", async () => {
    saveSettings("guest", { ...DEFAULT_SETTINGS, primary: "#2e7d32" });
    signedInAs(undefined, undefined);
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(probe()).toBe("light|#2e7d32|#ab47bc|nobody");
  });

  it("changes the theme as settings change, and keeps them for that user", async () => {
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(probe()).toContain("|dev"));

    let kept;
    act(() => {
      kept = latest.update({ mode: "dark", primary: "#5e35b1" });
    });

    expect(kept).toBe(true);
    expect(probe()).toBe("dark|#5e35b1|#ab47bc|dev");
    expect(loadSettings("dev")).toMatchObject({ mode: "dark", primary: "#5e35b1" });
    expect(loadSettings("player")).toEqual(DEFAULT_SETTINGS);
  });

  it("ignores a setting that isn't allowed", async () => {
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(probe()).toContain("|dev"));

    act(() => {
      latest.update({ primary: "not a color", mode: "neon" });
    });

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev");
  });

  it("says when the settings couldn't be kept, but still applies them", async () => {
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(probe()).toContain("|dev"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    let kept;
    act(() => {
      kept = latest.update({ primary: "#2e7d32" });
    });

    expect(kept).toBe(false);
    expect(probe()).toBe("light|#2e7d32|#ab47bc|dev");
    vi.restoreAllMocks();
  });

  it("resets the colors and mode but keeps the picture", async () => {
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(probe()).toContain("|dev"));
    act(() => {
      latest.update({ mode: "dark", primary: "#5e35b1", secondary: "#00acc1", avatar: AVATAR });
    });

    act(() => {
      latest.resetLook();
    });

    expect(probe()).toBe("light|#1976d2|#ab47bc|dev");
    expect(latest.settings.avatar).toBe(AVATAR);
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
    saveSettings("dev", { ...DEFAULT_SETTINGS, mode: "system" });
    rememberUser("dev");
    signedInAs("dev");
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(probe()).toBe("dark|#1976d2|#ab47bc|dev"));
  });
});

describe("without a provider", () => {
  it("gives the defaults, and changing them does nothing", () => {
    render(<Probe />);

    expect(probe()).toBe("light|#1976d2|#9c27b0|nobody"); // no ThemeProvider either, so MUI's own default theme
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.update({ mode: "dark" })).toBe(true);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("UserAvatar", () => {
  it("shows the picture when there is one", async () => {
    saveSettings("dev", { ...DEFAULT_SETTINGS, avatar: AVATAR });
    rememberUser("dev");
    signedInAs("dev");
    render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );

    expect(screen.getByRole("img", { name: "dev's picture" })).toHaveAttribute("src", AVATAR);
  });

  it("shows the first letter of the username when there is none, and a plain person when we don't know who", async () => {
    rememberUser("dev");
    signedInAs("dev");
    const { unmount } = render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );
    expect(screen.getByText("D")).toBeInTheDocument();
    unmount();

    window.localStorage.clear();
    stubApi({});
    render(
      <SettingsProvider>
        <UserAvatar />
      </SettingsProvider>,
    );
    expect(screen.queryByText("D")).not.toBeInTheDocument();
    expect(screen.getByTestId("PersonIcon")).toBeInTheDocument();
  });
});
