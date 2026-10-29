import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, loadCachedSettings, rememberUser, sanitizeFavoritePages } from "../../settings/settings";
import MainDrawer from "./MainDrawer";

afterEach(() => vi.unstubAllGlobals());

async function renderDrawer(favoritePages = [], setCurrentPage = vi.fn(), toggleDrawer = () => () => {}) {
  cacheSettings("dev", { ...DEFAULT_SETTINGS, favoritePages });
  rememberUser("dev");
  const fetchMock = stubApi({
    "GET /api/me": { id: 1, username: "dev" },
    "GET /api/me/settings": { favoritePages, avatarVersion: null },
    "PUT /api/me/settings": (body) => ({ ...body, avatarVersion: null }),
  });
  render(
    <SettingsProvider>
      <MainDrawer drawerOpen toggleDrawer={toggleDrawer} currentPage="Spells" setCurrentPage={setCurrentPage} />
    </SettingsProvider>,
  );
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/me/settings")).toBe(true));
  await act(async () => {});
  return { fetchMock, setCurrentPage };
}

describe("the drawer's favorites", () => {
  it("has no Favorites group until a page is pinned", async () => {
    await renderDrawer();

    expect(screen.queryByRole("list", { name: "Favorites" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "All pages" })).toBeInTheDocument();
  });

  it("pins a page to the top, keeps and sends it, and leaves it in the full list", async () => {
    const { fetchMock } = await renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Pin Creatures to favorites" }));

    expect(loadCachedSettings("dev").favoritePages).toEqual(["Creatures"]);
    const favorites = within(screen.getByRole("list", { name: "Favorites" }));
    expect(favorites.getByText("Creatures")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "All pages" })).getByText("Creatures")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init = {}]) => init.method === "PUT")).toBe(true), { timeout: 3000 });
    const put = fetchMock.mock.calls.find(([, init = {}]) => init.method === "PUT");
    expect(JSON.parse(put[1].body).favoritePages).toEqual(["Creatures"]);
  });

  it("unpins a page from either list, keeping the others in the order pinned", async () => {
    await renderDrawer(["Spells", "Creatures", "Items"]);

    fireEvent.click(within(screen.getByRole("list", { name: "Favorites" })).getByRole("button", { name: "Unpin Creatures from favorites" }));

    expect(loadCachedSettings("dev").favoritePages).toEqual(["Spells", "Items"]);
  });

  it("opens a pinned page from the Favorites group, and pinning doesn't open it or close the drawer", async () => {
    const closing = vi.fn();
    const { setCurrentPage } = await renderDrawer(["Items"], vi.fn(), () => closing);

    fireEvent.click(screen.getByRole("button", { name: "Pin Feats to favorites" }));
    expect(setCurrentPage).not.toHaveBeenCalled();
    expect(closing).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole("list", { name: "Favorites" })).getByRole("button", { name: "Items" }));
    expect(setCurrentPage).toHaveBeenCalledWith("Items");
  });
});

describe("sanitizeFavoritePages", () => {
  it("keeps pages that exist, once each, in order", () => {
    expect(sanitizeFavoritePages(["Spells", "Nowhere", "Creatures", "Spells", 4])).toEqual(["Spells", "Creatures"]);
    expect(sanitizeFavoritePages("Spells")).toEqual([]);
    expect(sanitizeFavoritePages(undefined)).toEqual([]);
  });
});
