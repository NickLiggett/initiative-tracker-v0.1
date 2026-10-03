import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

const CATEGORIES = { content: [{ key: "weapon", name: "Weapon" }, { key: "wondrous-item", name: "Wondrous Item" }] };
const RARITIES = { content: [{ key: "uncommon", name: "Uncommon" }, { key: "rare", name: "Rare" }] };

function stubBackend() {
  return stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/itemcategories": CATEGORIES,
    "GET /api/itemrarities": RARITIES,
    "GET /api/items": { content: [rope] },
    "GET /api/magicitems": { content: [bagOfHolding] },
  });
}

const searched = (fetchMock) => fetchMock.mock.calls.map(([url]) => url).filter((url) => /^\/api\/(magic)?items\?/.test(url));
const filters = () => within(screen.getByRole("group", { name: "Filters" }));

/** The results of the search, once they've come (the filters have `option`s too, so look in the listbox). */
async function results() {
  return within(await screen.findByRole("listbox", {}, { timeout: 2000 })).findAllByRole("option");
}

function type(text) {
  const input = screen.getByRole("combobox", { name: "Item" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
}

describe("ItemsPage", () => {
  it("finds items and magic items together, and shows the one chosen", async () => {
    stubBackend();
    render(<ItemsPage />);
    expect(screen.getByText("Search for an item to see its details.")).toBeInTheDocument();

    type("bag");

    const options = await results();
    expect(options.map((option) => option.textContent)).toEqual([
      "Bag of HoldingWondrous Item · Uncommon · 5e 2024 Rules",
      "RopeAdventuring Gear · 5e 2024 Rules",
    ]);

    fireEvent.click(options[0]);
    expect(await screen.findByRole("heading", { name: "Bag of Holding" })).toBeInTheDocument();
    expect(screen.getByText("Magic item · Wondrous Item · Uncommon")).toBeInTheDocument();
  });

  it("offers to compare, but not yet to make or change items", async () => {
    stubBackend();
    render(<ItemsPage />);
    type("rope");
    fireEvent.click((await results()).find((option) => option.textContent.startsWith("Rope")));
    await screen.findByRole("heading", { name: "Rope" });

    expect(screen.getByRole("button", { name: "Compare" })).toBeEnabled();
    for (const name of [/Duplicate/, /New item/, /Edit/, /Delete/]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("filters by kind and category", async () => {
    const fetchMock = stubBackend();
    render(<ItemsPage />);
    await waitFor(() => expect(filters().getByLabelText("Category")).toHaveTextContent("Wondrous Item"));

    fireEvent.change(filters().getByLabelText("Category"), { target: { value: "wondrous-item" } });
    fireEvent.click(filters().getByRole("button", { name: "Magic" }));
    type("bag");
    await results();

    expect(searched(fetchMock)).toEqual(["/api/magicitems?name=bag&pageSize=25&sort=name&category=wondrous-item"]);
    expect(filters().getByRole("button", { name: "Magic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to magic items when a rarity is chosen, and drops the rarity when ordinary items are", async () => {
    stubBackend();
    render(<ItemsPage />);
    await waitFor(() => expect(filters().getByLabelText("Rarity")).toHaveTextContent("Rare"));
    expect(filters().getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(filters().getByLabelText("Rarity"), { target: { value: "rare" } });
    expect(filters().getByRole("button", { name: "Magic" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(filters().getByRole("button", { name: "Ordinary" }));
    expect(filters().getByLabelText("Rarity")).toHaveValue("");
  });

  it("searches again with the new filters", async () => {
    const fetchMock = stubBackend();
    render(<ItemsPage />);
    type("bag");
    await results();
    expect(searched(fetchMock)).toHaveLength(2); // items and magic items

    await waitFor(() => expect(filters().getByLabelText("Rarity")).toHaveTextContent("Rare"));
    fireEvent.change(filters().getByLabelText("Rarity"), { target: { value: "rare" } });

    await waitFor(() => expect(searched(fetchMock)).toHaveLength(3), { timeout: 2000 });
    expect(searched(fetchMock)[2]).toBe("/api/magicitems?name=bag&pageSize=25&sort=name&rarity=rare");
  });
});
