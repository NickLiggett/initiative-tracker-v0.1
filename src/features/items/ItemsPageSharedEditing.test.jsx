import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import rope from "../../test/fixtures/item-rope.json";
import { ITEM_REFERENCE_ROUTES, OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import ItemsPage from "./ItemsPage";

afterEach(() => vi.unstubAllGlobals());

// u3-campaign is shared with the user as an editor, u2-homebrew as a viewer (see OWNERSHIP_ROUTES)
const lantern = { ...rope, key: "u3-campaign_lantern", name: "GM's Lantern", document: { key: "u3-campaign", displayName: "GM's campaign" } };
const cord = { ...rope, key: "u2-homebrew_cord", name: "Snarl's Cord", document: { key: "u2-homebrew", displayName: "Snarl's homebrew" } };

async function pick(text) {
  const input = screen.getByRole("combobox", { name: "Item" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "lantern" } });
  fireEvent.click(
    await waitFor(
      () => {
        const found = within(screen.getByRole("listbox")).getAllByRole("option").find((option) => option.textContent.includes(text));
        expect(found).toBeDefined();
        return found;
      },
      { timeout: 2500 },
    ),
  );
}

describe("items in a document shared with the user", () => {
  function stubBackend(extra = {}) {
    return stubApi({
      ...ITEM_REFERENCE_ROUTES,
      ...OWNERSHIP_ROUTES,
      "GET /api/items": { content: [lantern, cord] },
      "GET /api/magicitems": { content: [] },
      ...extra,
    });
  }

  it("can be changed and deleted by an editor", async () => {
    stubBackend();
    render(<ItemsPage />);

    await pick("GM's Lantern");

    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("says which document an editor is deleting from", async () => {
    const fetchMock = stubBackend({ "DELETE /api/items/u3-campaign_lantern": null });
    render(<ItemsPage />);
    await pick("GM's Lantern");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("It will be removed from GM's campaign for good. This can't be undone.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Search for an item to see its details.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/items/u3-campaign_lantern", expect.objectContaining({ method: "DELETE" }));
  });

  it("can only be looked at by a viewer", async () => {
    stubBackend();
    render(<ItemsPage />);
    await pick("Snarl's Cord");
    await screen.findByRole("heading", { name: "Snarl's Cord" });

    // let the permissions arrive before saying there is nothing
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/documents/u3-campaign/members", expect.anything()));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeEnabled(); // they can still copy it into their own
  });
});
