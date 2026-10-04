import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser } from "../../settings/settings";
import AppearanceSettings from "./AppearanceSettings";

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

function Probe() {
  const theme = useTheme();
  return <p data-testid="probe">{theme.palette.mode}|{theme.palette.primary.main}|{theme.palette.secondary.main}</p>;
}
const probe = () => screen.getByTestId("probe").textContent;

/** Shows the settings, for a user whose account already has `initial` settings (so there is nothing to move to it). */
async function renderSettings(initial = {}, extra = {}) {
  cacheSettings("dev", { ...DEFAULT_SETTINGS, ...initial });
  rememberUser("dev");
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dev" },
    "GET /api/me/settings": { ...initial, avatarVersion: null },
    "PUT /api/me/settings": (body) => ({ ...body, avatarVersion: null }),
    ...extra,
  });
  render(
    <SettingsProvider>
      <Probe />
      <AppearanceSettings />
    </SettingsProvider>,
  );
  await waitFor(() => expect(sent(fetchMock, "GET /api/me/settings")).toHaveLength(1));
  await act(async () => {});
  return fetchMock;
}

const sent = (fetchMock, route) =>
  fetchMock.mock.calls.filter(([url, init = {}]) => `${init.method ?? "GET"} ${url.split("?")[0]}` === route);

const mainColor = () => screen.getByLabelText("Main color");
const type = (field, text) => fireEvent.change(field, { target: { value: text } });

describe("mode", () => {
  it("switches between light and dark, and keeps the choice", async () => {
    await renderSettings();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(probe()).toBe("dark|#1976d2|#ab47bc");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(loadCachedSettings("dev").mode).toBe("dark");
  });

  it("can follow the device", async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("dark"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Match my device" }));

    expect(probe()).toBe("dark|#1976d2|#ab47bc");
    expect(loadCachedSettings("dev").mode).toBe("system");
  });
});

describe("color themes", () => {
  it("sets both colors at once, and shows which theme is in use", async () => {
    await renderSettings();
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Forest" }));

    expect(probe()).toBe("light|#2e7d32|#8d6e63");
    expect(screen.getByRole("button", { name: "Forest" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "false");
    expect(loadCachedSettings("dev")).toMatchObject({ primary: "#2e7d32", secondary: "#8d6e63" });
  });

  it("shows no theme as in use once a color is your own", async () => {
    await renderSettings({ primary: "#123456" });

    for (const name of ["Default", "Forest", "Ember", "Royal", "Slate", "Rose"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
  });
});

describe("your own colors", () => {
  it("changes the color once a whole code has been typed", async () => {
    await renderSettings();

    type(mainColor(), "#2E7D3");
    expect(probe()).toBe("light|#1976d2|#ab47bc"); // not yet: still typing

    type(mainColor(), "#2E7D32");
    expect(probe()).toBe("light|#2e7d32|#ab47bc");
    expect(loadCachedSettings("dev").primary).toBe("#2e7d32");
  });

  it("doesn't take a short code halfway through typing a long one, but does once typing stops", async () => {
    await renderSettings();

    type(mainColor(), "#197");
    expect(probe()).toBe("light|#1976d2|#ab47bc");
    expect(mainColor()).toHaveValue("#197"); // left as typed

    fireEvent.blur(mainColor());
    expect(probe()).toBe("light|#119977|#ab47bc");
    expect(mainColor()).toHaveValue("#119977");
  });

  it("says what's wrong with a code that isn't one, and puts the old color back when you leave", async () => {
    await renderSettings();

    type(mainColor(), "bluish");
    expect(screen.getByText("Use a color code like #1976d2.")).toBeInTheDocument();
    expect(probe()).toBe("light|#1976d2|#ab47bc");

    fireEvent.blur(mainColor());
    expect(mainColor()).toHaveValue("#1976d2");
    expect(screen.queryByText("Use a color code like #1976d2.")).not.toBeInTheDocument();
  });

  it("changes the second color the same way", async () => {
    await renderSettings();

    type(screen.getByLabelText("Second color"), "#00acc1");

    expect(probe()).toBe("light|#1976d2|#00acc1");
  });

  it("takes a color from the color chooser", async () => {
    await renderSettings();

    fireEvent.change(screen.getByLabelText("Main color chooser"), { target: { value: "#c2185b" } });

    expect(probe()).toBe("light|#c2185b|#ab47bc");
    expect(mainColor()).toHaveValue("#c2185b");
  });

  it("warns about a color that is hard to see against the page", async () => {
    await renderSettings();
    expect(screen.queryByText("This color is hard to see against the page.")).not.toBeInTheDocument();

    type(mainColor(), "#ffff99");

    expect(screen.getByText("This color is hard to see against the page.")).toBeInTheDocument();
  });

  it("judges a color against the dark page when the mode is dark", async () => {
    await renderSettings({ mode: "dark", primary: "#1a237e" });

    expect(screen.getByText("This color is hard to see against the page.")).toBeInTheDocument(); // navy on near-black
    type(mainColor(), "#90caf9");
    expect(screen.queryByText("This color is hard to see against the page.")).not.toBeInTheDocument();
  });
});

describe("resetting", () => {
  it("goes back to the default colors and mode", async () => {
    await renderSettings({ mode: "dark", primary: "#5e35b1", secondary: "#00acc1" });
    expect(probe()).toBe("dark|#5e35b1|#00acc1");

    fireEvent.click(screen.getByRole("button", { name: "Reset to the defaults" }));

    expect(probe()).toBe("light|#1976d2|#ab47bc");
    expect(loadCachedSettings("dev")).toMatchObject({ mode: "light", primary: "#1976d2", secondary: "#ab47bc" });
    expect(mainColor()).toHaveValue("#1976d2");
  });
});

describe("saving to the account", () => {
  it("sends the colors and mode a moment after they change, once", async () => {
    const fetchMock = await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Forest" }));
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(sent(fetchMock, "PUT /api/me/settings")).toHaveLength(0);

    await waitFor(() => expect(sent(fetchMock, "PUT /api/me/settings")).toHaveLength(1), { timeout: 3000 });
    expect(JSON.parse(sent(fetchMock, "PUT /api/me/settings")[0][1].body)).toEqual({
      mode: "dark",
      primary: "#2e7d32",
      secondary: "#8d6e63",
    });
  });

  it("says it's saved to the account, until it can't be", async () => {
    await renderSettings({}, { "PUT /api/me/settings": () => new Response("{}", { status: 500 }) });
    expect(screen.getByText("Your colors are saved to your account, so they follow you to other browsers.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(await screen.findByText(/Couldn't save your changes to your account/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(probe()).toBe("dark|#1976d2|#ab47bc"); // they still apply
    expect(loadCachedSettings("dev").mode).toBe("dark");
  });
});
