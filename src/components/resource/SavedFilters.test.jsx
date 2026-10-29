import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser, sanitizeSavedFilters } from "../../settings/settings";
import SavedFilters from "./SavedFilters";

afterEach(() => vi.unstubAllGlobals());

const DEFAULTS = { level: "", sources: [] };

function Page({ start = { level: "3", sources: ["kp"] } }) {
  const [filters, setFilters] = useState(start);
  return (
    <>
      <SavedFilters page="spells" defaults={DEFAULTS} filters={filters} onApply={setFilters} />
      <output aria-label="Filters now">{JSON.stringify(filters)}</output>
    </>
  );
}

async function renderPage(saved = {}, props = {}) {
  cacheSettings("dev", { ...DEFAULT_SETTINGS, savedFilters: saved });
  rememberUser("dev");
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dev" },
    "GET /api/me/settings": { savedFilters: saved, avatarVersion: null },
    "PUT /api/me/settings": (body) => ({ ...body, avatarVersion: null }),
  });
  render(
    <SettingsProvider>
      <Page {...props} />
    </SettingsProvider>,
  );
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/me/settings")).toBe(true));
  await act(async () => {});
  return fetchMock;
}

const open = () => fireEvent.click(screen.getByRole("button", { name: /Saved filters/ }));
const now = () => JSON.parse(screen.getByLabelText("Filters now").textContent);

describe("SavedFilters", () => {
  it("says when nothing is saved", async () => {
    await renderPage();

    open();

    expect(await screen.findByRole("menuitem", { name: "Nothing saved yet" })).toBeInTheDocument();
  });

  it("saves the filters as they are under a name, kept and sent to the account", async () => {
    const fetchMock = await renderPage();

    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save these filters…" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Save these filters" }));
    expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Kobold level 3" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(loadCachedSettings("dev").savedFilters).toEqual({ spells: [{ name: "Kobold level 3", filters: { level: "3", sources: ["kp"] } }] });
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init = {}]) => init.method === "PUT")).toBe(true), { timeout: 3000 });
    const put = fetchMock.mock.calls.find(([, init = {}]) => init.method === "PUT");
    expect(JSON.parse(put[1].body).savedFilters.spells[0].name).toBe("Kobold level 3");
  });

  it("applies a saved one over the page's own defaults", async () => {
    await renderPage({ spells: [{ name: "Old", filters: { level: "1" } }] }, { start: { level: "9", sources: ["x"] } });

    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Old/ }));

    expect(now()).toEqual({ level: "1", sources: [] }); // `sources` came from the defaults: it wasn't saved
  });

  it("replaces a saved one of the same name, and deletes one", async () => {
    await renderPage({ spells: [{ name: "Mine", filters: { level: "1" } }, { name: "Other", filters: {} }] });

    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save these filters…" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Save these filters" }));
    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Mine" } });
    expect(dialog.getByText("Replaces the one with this name")).toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(loadCachedSettings("dev").savedFilters.spells.map((one) => one.name).sort()).toEqual(["Mine", "Other"]);
    expect(loadCachedSettings("dev").savedFilters.spells.find((one) => one.name === "Mine").filters.level).toBe("3");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Delete saved filter Other" }));
    expect(loadCachedSettings("dev").savedFilters.spells.map((one) => one.name)).toEqual(["Mine"]);
  });
});

describe("sanitizeSavedFilters", () => {
  it("keeps named filters, and drops anything that isn't", () => {
    expect(
      sanitizeSavedFilters({
        spells: [{ name: " Fire ", filters: { a: 1 } }, { name: "", filters: {} }, { name: "x", filters: [] }, "nope", { filters: {} }],
        junk: "text",
      }),
    ).toEqual({ spells: [{ name: "Fire", filters: { a: 1 } }] });
    expect(sanitizeSavedFilters(null)).toEqual({});
    expect(sanitizeSavedFilters([])).toEqual({});
  });

  it("keeps no more than 20 for a page, and names of 40 characters at most", () => {
    const many = Array.from({ length: 25 }, (_, n) => ({ name: `f${n}`.padEnd(60, "x"), filters: {} }));
    const kept = sanitizeSavedFilters({ spells: many }).spells;
    expect(kept).toHaveLength(20);
    expect(kept[0].name).toHaveLength(40);
  });
});
