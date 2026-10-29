import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser } from "../../settings/settings";
import TrackerSettings from "./TrackerSettings";

afterEach(() => vi.unstubAllGlobals());

const sent = (fetchMock, route) =>
  fetchMock.mock.calls.filter(([url, init = {}]) => `${init.method ?? "GET"} ${url.split("?")[0]}` === route);

async function renderSettings(initial = {}) {
  cacheSettings("dev", { ...DEFAULT_SETTINGS, ...initial });
  rememberUser("dev");
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dev" },
    "GET /api/me/settings": { ...initial, avatarVersion: null },
    "PUT /api/me/settings": (body) => ({ ...body, avatarVersion: null }),
  });
  render(
    <SettingsProvider>
      <TrackerSettings />
    </SettingsProvider>,
  );
  await waitFor(() => expect(sent(fetchMock, "GET /api/me/settings")).toHaveLength(1));
  await act(async () => {});
  return fetchMock;
}

describe("TrackerSettings", () => {
  it("counts down by default", async () => {
    await renderSettings();

    expect(screen.getByRole("button", { name: "Count down" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Count up" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to counting up, and keeps and sends the choice", async () => {
    const fetchMock = await renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Count up" }));

    expect(screen.getByRole("button", { name: "Count up" })).toHaveAttribute("aria-pressed", "true");
    expect(loadCachedSettings("dev").hpMode).toBe("up");
    await waitFor(() => expect(sent(fetchMock, "PUT /api/me/settings")).toHaveLength(1), { timeout: 3000 });
    expect(JSON.parse(sent(fetchMock, "PUT /api/me/settings")[0][1].body)).toMatchObject({ hpMode: "up" });
  });

  it("shows the choice the account has", async () => {
    await renderSettings({ hpMode: "up" });

    expect(screen.getByRole("button", { name: "Count up" })).toHaveAttribute("aria-pressed", "true");
  });
});
