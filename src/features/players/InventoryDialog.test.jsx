import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import InventoryDialog from "./InventoryDialog";

afterEach(() => vi.unstubAllGlobals());

const player = { id: 7, name: "Thorin" };
const bag = {
  platinum: 2,
  gold: 15,
  silver: 3,
  copper: 7,
  items: [{ itemKey: "srd_rope", kind: "ITEM", name: "Rope", quantity: 2, equipped: false, attuned: false, notes: "50 ft" }],
};

const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

async function open(routes = {}, props = {}) {
  const onClose = vi.fn();
  const fetchMock = stubApi({
    "GET /api/players/7/inventory": bag,
    "PUT /api/players/7/inventory": (body) => body,
    "GET /api/documents": { content: [] },
    "GET /api/items": { content: [{ key: "srd_torch", name: "Torch" }] },
    "GET /api/magicitems": { content: [{ key: "srd_cloak", name: "Cloak of Protection", rarity: "uncommon", requiresAttunement: true }] },
    ...routes,
  });
  render(<InventoryDialog player={player} onClose={onClose} {...props} />);
  await screen.findByLabelText("Name of line 1");
  return { fetchMock, onClose };
}

describe("the inventory dialog", () => {
  it("shows the coins and the lines the backend has", async () => {
    await open();

    expect(field("Platinum (pp)")).toHaveValue("2");
    expect(field("Gold (gp)")).toHaveValue("15");
    expect(field("Silver (sp)")).toHaveValue("3");
    expect(field("Copper (cp)")).toHaveValue("7");
    expect(field("Name of line 1")).toHaveValue("Rope");
    expect(field("Quantity of line 1")).toHaveValue("2");
    expect(field("Note on line 1")).toHaveValue("50 ft");
  });

  it("saves changed coins, a changed quantity and a line typed by hand", async () => {
    const { fetchMock, onClose } = await open();

    type("Platinum (pp)", "5");
    type("Gold (gp)", "20");
    type("Quantity of line 1", "3");
    type("Add an item", "Grandfather's locket");
    fireEvent.click(screen.getByRole("button", { name: "Add as written" }));
    fireEvent.click(field("Equipped, line 2"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/inventory")).toEqual([
      {
        platinum: 5,
        gold: 20,
        silver: 3,
        copper: 7,
        items: [
          { itemKey: "srd_rope", kind: "ITEM", name: "Rope", quantity: 3, equipped: false, attuned: false, notes: "50 ft" },
          { itemKey: null, kind: null, name: "Grandfather's locket", quantity: 1, equipped: true, attuned: false, notes: null },
        ],
      },
    ]);
  });

  it("adds an item found by name, keeping which one it is", async () => {
    const { fetchMock, onClose } = await open();

    type("Add an item", "Cloak");
    fireEvent.click(await screen.findByRole("option", { name: /Cloak of Protection/ }));
    expect(field("Name of line 2")).toHaveValue("Cloak of Protection");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/inventory")[0].items[1]).toMatchObject({ itemKey: "srd_cloak", kind: "MAGIC", name: "Cloak of Protection" });
  });

  it("removes a line", async () => {
    const { fetchMock, onClose } = await open();

    fireEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/inventory")[0].items).toEqual([]);
  });

  it("can't be saved while something is wrong, and says what", async () => {
    await open();

    type("Quantity of line 1", "0");

    expect(screen.getByRole("status")).toHaveTextContent("The quantity of Rope must be 1 to 9999.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("says why when it can't be saved", async () => {
    await open({ "PUT /api/players/7/inventory": () => new Response(JSON.stringify({ detail: "No." }), { status: 403 }) });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/./, { selector: ".MuiAlert-message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("is only for reading when it can't be changed", async () => {
    await open({}, { readOnly: true });

    expect(field("Gold (gp)")).toBeDisabled();
    expect(field("Name of line 1")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add an item")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove line 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("says when it can't be loaded", async () => {
    stubApi({ "GET /api/players/7/inventory": () => new Response("{}", { status: 500 }) });
    render(<InventoryDialog player={player} onClose={() => {}} />);

    expect(await screen.findByText("Couldn't load what this character carries.")).toBeInTheDocument();
  });
});
