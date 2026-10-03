import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import { ITEM_REFERENCE_ROUTES, OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

const mine = { ...rope, key: "u1-homebrew_rope", name: "Gribble's Rope", document: { key: "u1-homebrew", displayName: "dev's homebrew" } };

function stubBackend(extra = {}) {
  return stubApi({
    ...ITEM_REFERENCE_ROUTES,
    ...OWNERSHIP_ROUTES,
    "GET /api/items": { content: [rope, mine] },
    "GET /api/magicitems": { content: [bagOfHolding] },
    ...extra,
  });
}

async function pick(text) {
  const input = screen.getByRole("combobox", { name: "Item" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "x" + text } });
  const results = await within(await screen.findByRole("listbox", {}, { timeout: 2000 })).findAllByRole("option");
  fireEvent.click(results.find((option) => option.textContent.includes(text)));
}

describe("making items", () => {
  it("opens an empty editor for a new item, and shows the item once it's saved", async () => {
    stubBackend({
      "POST /api/items": (body) => ({ ...body, key: "u1-homebrew_new", document: { key: "u1-homebrew", displayName: "dev's homebrew" } }),
    });
    render(<ItemsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New item" }));
    expect(screen.getByRole("heading", { name: "New item" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Item" })).not.toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText(/^Item name/), { target: { value: "Fresh Torch" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" }); // back from the editor, which has its own preview
    expect(screen.getByRole("heading", { name: "Fresh Torch" })).toBeInTheDocument();
    expect(screen.getByText("dev's homebrew")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument(); // it's theirs now
  });

  it("goes back without saving when cancelled", async () => {
    stubBackend();
    render(<ItemsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New item" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("combobox", { name: "Item" })).toBeInTheDocument();
  });
});

describe("duplicating items", () => {
  it("copies an ordinary item through the items, and opens the copy in the editor", async () => {
    const copy = { ...rope, key: "u1-homebrew_rope-2", derivedFrom: rope.key, document: mine.document };
    const fetchMock = stubBackend({
      [`POST /api/items/${rope.key}/copy`]: copy,
      "PUT /api/items/u1-homebrew_rope-2": (body) => body,
    });
    render(<ItemsPage />);
    await pick("Adventuring Gear · 5e 2024 Rules");
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Rope" })).toBeInTheDocument();
    expect(screen.getByText(`Based on ${rope.key}`)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Item name/), { target: { value: "Better Rope" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(screen.getByRole("heading", { name: "Better Rope" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PUT /api/items/u1-homebrew_rope-2")[0]).toMatchObject({ name: "Better Rope", desc: rope.desc });
  });

  it("copies a magic item through the magic items", async () => {
    const copy = { ...bagOfHolding, key: "u1-homebrew_bag-of-holding", derivedFrom: bagOfHolding.key, document: mine.document };
    const fetchMock = stubBackend({ [`POST /api/magicitems/${bagOfHolding.key}/copy`]: copy });
    render(<ItemsPage />);
    await pick("Wondrous Item · Uncommon");
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Bag of Holding" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Rarity/)).toHaveValue("uncommon");
    expect(fetchMock).toHaveBeenCalledWith(`/api/magicitems/${bagOfHolding.key}/copy`, expect.objectContaining({ method: "POST" }));
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining(`/api/items/${bagOfHolding.key}`), expect.anything());
  });

  it("says so when an item can't be duplicated", async () => {
    stubBackend(); // no route for the copy: a 404
    render(<ItemsPage />);
    await pick("Adventuring Gear · 5e 2024 Rules");

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't duplicate Rope");
  });
});

describe("changing your own items", () => {
  it("offers Edit on an item in the user's own document, and not Delete yet", async () => {
    stubBackend({ "PUT /api/items/u1-homebrew_rope": (body) => body });
    render(<ItemsPage />);
    await pick("Gribble's Rope");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Gribble's Rope" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
