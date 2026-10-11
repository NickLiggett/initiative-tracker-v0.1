import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1" };
const weapon = { key: "weapon", name: "Weapon" };
const wondrous = { key: "wondrous-item", name: "Wondrous Item" };

const sword = { key: "srd_longsword", name: "Longsword", category: weapon, cost: 15, weight: 3, weightUnit: "lb", document: srd };
const rope = { key: "srd_rope", name: "Rope", category: { key: "gear", name: "Adventuring Gear" }, cost: 1, weight: 10, weightUnit: "lb", document: srd };
const cloak = {
  key: "srd_cloak-of-protection",
  name: "Cloak of Protection",
  category: wondrous,
  rarity: { key: "uncommon", name: "Uncommon" },
  requiresAttunement: true,
  attunementDetail: "",
  cost: 0,
  weight: 1,
  weightUnit: "lb",
  document: srd,
};
const bag = {
  key: "srd_bag-of-holding",
  name: "Bag of Holding",
  category: wondrous,
  rarity: { key: "rare", name: "Rare" },
  requiresAttunement: false,
  cost: 4000,
  weight: 15,
  weightUnit: "lb",
  document: srd,
};

/** A backend that lists each collection the way the real one pages and sorts them. */
function stubBackend() {
  const base = stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/itemcategories": { content: [weapon, wondrous] },
    "GET /api/itemrarities": { content: [{ key: "rare", name: "Rare" }, { key: "uncommon", name: "Uncommon" }] },
  });
  const collections = { "/api/items": [sword, rope], "/api/magicitems": [cloak, bag] };
  const searches = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    const all = collections[address.pathname];
    if ((init.method ?? "GET") === "GET" && all && address.searchParams.has("page")) {
      const params = Object.fromEntries(address.searchParams);
      searches.push({ path: address.pathname, ...params });
      const found = all.filter(
        (one) =>
          one.name.toLowerCase().includes((params.name ?? "").toLowerCase()) &&
          (!params.category || one.category.key === params.category) &&
          (!params.rarity || one.rarity?.key === params.rarity),
      );
      const [field, direction] = params.sort.split(",");
      const sorted = [...found].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (direction === "desc" ? -1 : 1));
      return new Response(JSON.stringify({ content: sorted, page: { number: 0, size: Number(params.pageSize), totalElements: sorted.length, totalPages: 1 } }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.searches = searches;
  return fetchMock;
}

const table = () => within(screen.getByRole("table", { name: "Item results" }));
const names = () => table().getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("listing items as a table", () => {
  it("lists the magic items when Search is pressed, with their rarity, attunement, cost and weight", async () => {
    const fetchMock = stubBackend();
    render(<ItemsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Item results" });
    expect(names()).toEqual(["Bag of Holding", "Cloak of Protection"]);
    const cloakRow = table().getAllByRole("row")[2];
    expect(within(cloakRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Cloak of Protection", "Wondrous Item", "Uncommon", "Required", "—", "1 lb", "5e 2014 Rules",
    ]);
    expect(fetchMock.searches.at(-1)).toMatchObject({ path: "/api/magicitems", sort: "name,asc", pageSize: "25" });
  });

  it("lists the ordinary items instead, which have no rarity to ask for", async () => {
    const fetchMock = stubBackend();
    render(<ItemsPage />);
    await screen.findByRole("option", { name: "Rare" });
    fireEvent.change(screen.getByLabelText("Rarity"), { target: { value: "rare" } });

    fireEvent.click(screen.getByRole("button", { name: "Ordinary items" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Item results" });
    expect(names()).toEqual(["Longsword", "Rope"]);
    expect(fetchMock.searches.at(-1)).toMatchObject({ path: "/api/items" });
    expect(fetchMock.searches.at(-1)).not.toHaveProperty("rarity");
  });

  it("narrows by category and rarity, and sorts by cost", async () => {
    const fetchMock = stubBackend();
    render(<ItemsPage />);
    await screen.findByRole("option", { name: "Rare" });

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "wondrous-item" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Item results" });
    fireEvent.click(screen.getByRole("button", { name: "Cost" }));
    fireEvent.click(screen.getByRole("button", { name: "Cost" }));

    await waitFor(() => expect(names()).toEqual(["Bag of Holding", "Cloak of Protection"]));
    expect(fetchMock.searches.at(-1)).toMatchObject({ path: "/api/magicitems", category: "wondrous-item", sort: "cost,desc" });
  });

  it("opens an item from the table, and goes back to the results", async () => {
    stubBackend();
    render(<ItemsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Item results" });

    fireEvent.click(screen.getByRole("button", { name: "Open Bag of Holding" }));

    expect(await screen.findByRole("heading", { name: "Bag of Holding" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to results" }));
    expect(screen.getByRole("table", { name: "Item results" })).toBeInTheDocument();
  });
});
