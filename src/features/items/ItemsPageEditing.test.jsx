import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import { ITEM_REFERENCE_ROUTES, OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

const homebrew = { key: "u1-homebrew", displayName: "dev's homebrew" };
const mine = { ...rope, key: "u1-homebrew_rope", name: "Gribble's Rope", document: homebrew };
const mineMagic = { ...bagOfHolding, key: "u1-homebrew_bag", name: "Gribble's Bag", document: homebrew };
const theirs = { ...rope, key: "u2-homebrew_cord", name: "Snarl's Cord", document: { key: "u2-homebrew", displayName: "other's homebrew" } };

function stubBackend(extra = {}) {
  return stubApi({
    ...ITEM_REFERENCE_ROUTES,
    ...OWNERSHIP_ROUTES,
    "GET /api/items": { content: [rope, mine, theirs] },
    "GET /api/magicitems": { content: [bagOfHolding, mineMagic] },
    ...extra,
  });
}

async function pick(text) {
  const input = screen.getByRole("combobox", { name: "Item" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "x" + text } });
  // Wait for the option itself: a listbox from the last choice may still be closing, with only that choice in it.
  const option = await waitFor(
    () => {
      const found = within(screen.getByRole("listbox")).getAllByRole("option").find((candidate) => candidate.textContent.includes(text));
      expect(found).toBeDefined();
      return found;
    },
    { timeout: 2500 },
  );
  fireEvent.click(option);
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
    await pick("Wondrous Item · Uncommon · 5e 2024 Rules");
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
  it("offers Edit and Delete on items in a document the user owns, and not on anyone else's", async () => {
    stubBackend();
    render(<ItemsPage />);

    await pick("Gribble's Rope");
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await pick("Snarl's Cord"); // another user's homebrew
    await screen.findByRole("heading", { name: "Snarl's Cord" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    await pick("Adventuring Gear · 5e 2024 Rules"); // default content
    await screen.findByRole("heading", { name: "Rope" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("opens the editor to change an item", async () => {
    const fetchMock = stubBackend({ "PUT /api/items/u1-homebrew_rope": (body) => body });
    render(<ItemsPage />);
    await pick("Gribble's Rope");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Gribble's Rope" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Item name/), { target: { value: "Gribble's Better Rope" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(screen.getByRole("heading", { name: "Gribble's Better Rope" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PUT /api/items/u1-homebrew_rope")[0]).toMatchObject({ name: "Gribble's Better Rope" });
  });

  it("asks before deleting, and then deletes", async () => {
    const fetchMock = stubBackend({ "DELETE /api/items/u1-homebrew_rope": null });
    render(<ItemsPage />);
    await pick("Gribble's Rope");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete Gribble's Rope?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("u1-homebrew_rope"), expect.objectContaining({ method: "DELETE" }));
    expect(screen.getByRole("heading", { name: "Gribble's Rope" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Search for an item to see its details.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/items/u1-homebrew_rope", expect.objectContaining({ method: "DELETE" }));
  });

  it("deletes a magic item from the magic items", async () => {
    const fetchMock = stubBackend({ "DELETE /api/magicitems/u1-homebrew_bag": null });
    render(<ItemsPage />);
    await pick("Gribble's Bag");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Search for an item to see its details.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/magicitems/u1-homebrew_bag", expect.objectContaining({ method: "DELETE" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/items/u1-homebrew_bag", expect.anything());
  });

  it("keeps the item and says why when it can't be deleted", async () => {
    stubBackend(); // no route for the DELETE: a 404
    render(<ItemsPage />);
    await pick("Gribble's Rope");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete Gribble's Rope");
    expect(screen.getByRole("heading", { name: "Gribble's Rope" })).toBeInTheDocument();
  });
});
