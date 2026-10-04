import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, loadSettings, rememberUser, saveSettings } from "../../settings/settings";
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

async function renderSettings(initial = {}) {
  saveSettings("dev", { ...DEFAULT_SETTINGS, ...initial });
  rememberUser("dev");
  stubApi({ "GET /api/me": { id: 1, username: "dev" } });
  render(
    <SettingsProvider>
      <Probe />
      <AppearanceSettings />
    </SettingsProvider>,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalled());
}

const mainColor = () => screen.getByLabelText("Main color");
const type = (field, text) => fireEvent.change(field, { target: { value: text } });

describe("mode", () => {
  it("switches between light and dark, and keeps the choice", async () => {
    await renderSettings();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(probe()).toBe("dark|#1976d2|#ab47bc");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(loadSettings("dev").mode).toBe("dark");
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
    expect(loadSettings("dev").mode).toBe("system");
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
    expect(loadSettings("dev")).toMatchObject({ primary: "#2e7d32", secondary: "#8d6e63" });
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
    expect(loadSettings("dev").primary).toBe("#2e7d32");
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
    expect(loadSettings("dev")).toMatchObject({ mode: "light", primary: "#1976d2", secondary: "#ab47bc" });
    expect(mainColor()).toHaveValue("#1976d2");
  });
});
