import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

function stubBackend(ordinary, magic) {
  stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/itemcategories": { content: [] },
    "GET /api/itemrarities": { content: [] },
    "GET /api/items": { content: ordinary },
    "GET /api/magicitems": { content: magic },
  });
}

/** Types into the search with this label and picks the result containing this text. */
async function pick(label, text, name) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  const results = await within(await screen.findByRole("listbox", {}, { timeout: 2000 })).findAllByRole("option");
  fireEvent.click(results.find((option) => option.textContent.includes(name)));
}

describe("comparing items", () => {
  it("lines two items up in a table, then their descriptions", async () => {
    stubBackend([rope], [bagOfHolding]);
    render(<ItemsPage />);

    await pick("Item", "rope", "Rope");
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByText("Choose a second item to compare with.")).toBeInTheDocument();

    await pick("Compare with", "bag", "Bag of Holding");

    const table = await screen.findByRole("table", { name: "Comparison" });
    expect(within(table).getByRole("columnheader", { name: /Bag of Holding/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Kind Item Magic item/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Cost 1 gp —/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rope" })).toBeInTheDocument(); // above its description
    expect(screen.getByText(/tie a knot with Rope/)).toBeInTheDocument();
    expect(screen.getByText(/interior space considerably larger/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop comparing" }));
    expect(screen.queryByRole("table", { name: "Comparison" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rope" })).toBeInTheDocument();
  });

  it("says when two items have the same description, as the 2014 and 2024 versions often do", async () => {
    const older = { ...rope, key: "srd-2014_rope", document: { ...rope.document, displayName: "5e 2014 Rules" }, cost: 1 };
    const newer = { ...rope, cost: 2 };
    stubBackend([older, newer], []);
    render(<ItemsPage />);

    await pick("Item", "rope", "5e 2014");
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Compare with", "rope", "5e 2024");

    const table = await screen.findByRole("table", { name: "Comparison" });
    expect(within(table).getByRole("row", { name: /Cost 1 gp 2 gp/ })).toBeInTheDocument();
    expect(screen.getByText("Both descriptions are the same.")).toBeInTheDocument();
    expect(screen.getAllByText(/tie a knot with Rope/)).toHaveLength(1);
  });
});
