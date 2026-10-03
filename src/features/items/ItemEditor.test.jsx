import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import chainMail from "../../test/fixtures/item-chain-mail.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import { ITEM_REFERENCE_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import ItemEditor from "./ItemEditor";

afterEach(() => vi.unstubAllGlobals());

const form = () => within(screen.getByRole("form", { name: "Item details" }));
const preview = () => within(screen.getByLabelText("Preview"));
const type = (label, value) => fireEvent.change(form().getByLabelText(label), { target: { value } });
const click = (name) => fireEvent.click(form().getByRole("button", { name }));

function renderEditor(item = null, routes = {}) {
  const all = {
    ...ITEM_REFERENCE_ROUTES,
    "POST /api/items": (body) => ({ ...body, key: "u1-homebrew_x" }),
    "POST /api/magicitems": (body) => ({ ...body, key: "u1-homebrew_x" }),
    ...routes,
  };
  const fetchMock = stubApi(Object.fromEntries(Object.entries(all).filter(([, answer]) => answer !== undefined))); // undefined: no route
  const onSaved = vi.fn();
  render(<ItemEditor item={item} onSaved={onSaved} onCancel={() => {}} />);
  return { fetchMock, onSaved };
}

/** Waits for the lists the form offers to arrive. */
const listsLoaded = () => waitFor(() => expect(form().getByLabelText("Category")).toHaveTextContent("Weapon"));

async function save({ fetchMock, onSaved }, route) {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  return bodiesSentTo(fetchMock, route)[0];
}

describe("a new item", () => {
  it("needs a name, and shows the item as it's filled in", async () => {
    renderEditor();
    await listsLoaded();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Give the item a name.");
    expect(preview().getByRole("heading", { name: "Untitled item" })).toBeInTheDocument();

    type(/^Item name/, "Gribble's Rope");
    type("Cost", "5");
    type("Coin", "sp");
    type("Weight (lb)", "2");

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(preview().getByRole("heading", { name: "Gribble's Rope" })).toBeInTheDocument();
    expect(preview().getByText("5 sp")).toBeInTheDocument();
    expect(preview().getByText("2 lb")).toBeInTheDocument();
  });

  it("is saved as an ordinary item, with its cost in gold", async () => {
    const editor = renderEditor();
    await listsLoaded();
    type(/^Item name/, "Gribble's Rope");
    type("Category", "adventuring-gear");
    type("Description", "A good rope.");
    type("Cost", "5");
    type("Coin", "sp");

    const sent = await save(editor, "POST /api/items");

    expect(sent).toMatchObject({ name: "Gribble's Rope", desc: "A good rope.", category: { key: "adventuring-gear", name: "Adventuring Gear" }, cost: 0.5, weapon: null, armor: null });
    expect(sent).not.toHaveProperty("rarity");
  });

  it("is saved as a magic item, which needs a rarity, with its attunement", async () => {
    const editor = renderEditor();
    await listsLoaded();
    expect(form().queryByLabelText("Rarity")).not.toBeInTheDocument();

    fireEvent.click(form().getByRole("button", { name: "Magic item" }));
    type(/^Item name/, "Ring of Gribbling");
    expect(screen.getByRole("status")).toHaveTextContent("Choose a rarity for the magic item.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    type(/^Rarity/, "rare");
    fireEvent.click(form().getByRole("checkbox", { name: "Requires attunement" }));
    type("Attunement detail", "requires attunement by a wizard");
    expect(preview().getByText("Magic item · Rare")).toBeInTheDocument();
    expect(preview().getByText("Requires attunement by a wizard")).toBeInTheDocument();

    const sent = await save(editor, "POST /api/magicitems");
    expect(sent).toMatchObject({ rarity: { key: "rare", name: "Rare", rank: 3 }, requiresAttunement: true, attunementDetail: "requires attunement by a wizard" });
  });
});

describe("weapons", () => {
  it("are switched on by the Weapon category, and saved with their damage and properties", async () => {
    const editor = renderEditor();
    await listsLoaded();
    expect(form().queryByLabelText("Damage dice")).not.toBeInTheDocument();

    type(/^Item name/, "Gribble Blade");
    type("Category", "weapon");
    type("Damage dice", "1d8");
    type("Damage type", "fire");
    type("Weapon class", "martial");

    const picker = within(form().getAllByRole("group", { name: "Properties" })[0]);
    fireEvent.keyDown(picker.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /Versatile/ }));
    type("Detail", "1d10");

    expect(preview().getByText("1d8 fire")).toBeInTheDocument();
    expect(within(preview().getByRole("group", { name: "Properties" })).getByText("Versatile (1d10)")).toBeInTheDocument();

    const sent = await save(editor, "POST /api/items");
    expect(sent.weapon).toMatchObject({
      name: "Gribble Blade",
      damageDice: "1d8",
      damageType: { key: "fire", name: "Fire" },
      isMartial: true,
      isSimple: false,
      properties: [{ detail: "1d10", property: { name: "Versatile", desc: "One or two hands.", type: null } }],
    });
  });

  it("can have masteries too, and a property can be taken off again", async () => {
    renderEditor();
    await listsLoaded();
    fireEvent.click(form().getByRole("checkbox", { name: "This item is a weapon" }));
    const picker = () => within(form().getAllByRole("group", { name: "Properties" })[0]);

    fireEvent.keyDown(picker().getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /Sap/ }));
    expect(form().getByRole("group", { name: "Sap mastery" })).toBeInTheDocument();
    expect(preview().getByRole("group", { name: "Mastery" })).toBeInTheDocument();

    fireEvent.click(form().getByRole("button", { name: "Remove Sap" }));
    expect(form().queryByRole("group", { name: "Sap mastery" })).not.toBeInTheDocument();
  });

  it("don't get the same property twice", async () => {
    renderEditor();
    await listsLoaded();
    fireEvent.click(form().getByRole("checkbox", { name: "This item is a weapon" }));
    const picker = () => within(form().getAllByRole("group", { name: "Properties" })[0]);

    for (let times = 0; times < 2; times++) {
      fireEvent.keyDown(picker().getByRole("combobox"), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name: /Versatile/ }));
    }

    expect(form().getAllByRole("group", { name: "Versatile" })).toHaveLength(1);
  });
});

describe("armor", () => {
  it("is switched on by the Armor category, and shows its armor class as the source writes it", async () => {
    const editor = renderEditor();
    await listsLoaded();
    type(/^Item name/, "Gribble Mail");
    type("Category", "armor");

    type("Armor type", "medium");
    type(/^Armor class/, "14");
    type("Max Dexterity bonus", "2");
    type("Strength required", "13");
    fireEvent.click(form().getByRole("checkbox", { name: "Disadvantage on Stealth checks" }));
    expect(form().getByText("Shown as 14 + Dex modifier (max 2)")).toBeInTheDocument();
    expect(preview().getByText("14 + Dex modifier (max 2)")).toBeInTheDocument();

    const sent = await save(editor, "POST /api/items");
    expect(sent.armor).toMatchObject({ category: "medium", acDisplay: "14 + Dex modifier (max 2)", acBase: 14, acAddDexmod: true, acCapDexmod: 2, strengthScoreRequired: 13, grantsStealthDisadvantage: true });
  });

  it("needs an armor class, and has no Dexterity cap without the Dexterity modifier", async () => {
    renderEditor();
    await listsLoaded();
    type(/^Item name/, "Gribble Mail");
    fireEvent.click(form().getByRole("checkbox", { name: "This item is armor" }));

    type(/^Armor class/, "");
    expect(screen.getByRole("status")).toHaveTextContent("Give the armor an armor class.");

    fireEvent.click(form().getByRole("checkbox", { name: "Add Dexterity modifier" }));
    expect(form().queryByLabelText("Max Dexterity bonus")).not.toBeInTheDocument();
  });
});

describe("changing an existing item", () => {
  it("replaces it, keeping what the form doesn't show, and the kind can't change", async () => {
    const mine = { ...chainMail, key: "u1-homebrew_chain-mail", derivedFrom: chainMail.key };
    const editor = renderEditor(mine, { "PUT /api/items/u1-homebrew_chain-mail": (body) => body });
    await listsLoaded();
    expect(screen.getByText(`Based on ${chainMail.key}`)).toBeInTheDocument();
    expect(form().queryByRole("button", { name: "Magic item" })).not.toBeInTheDocument();
    expect(form().getByLabelText(/^Armor class/)).toHaveValue("16");

    type(/^Item name/, "Heavy Chain Mail");
    type(/^Armor class/, "17");
    const sent = await save(editor, "PUT /api/items/u1-homebrew_chain-mail");

    expect(sent).toMatchObject({ name: "Heavy Chain Mail", size: chainMail.size, crossreferences: chainMail.crossreferences });
    expect(sent.armor).toMatchObject({ acBase: 17, acDisplay: "17", key: chainMail.armor.key });
  });

  it("goes to the magic items for a magic item", async () => {
    const mine = { ...bagOfHolding, key: "u1-homebrew_bag" };
    const editor = renderEditor(mine, { "PUT /api/magicitems/u1-homebrew_bag": (body) => body });
    await listsLoaded();
    expect(form().getByLabelText(/^Rarity/)).toHaveValue("uncommon");

    const sent = await save(editor, "PUT /api/magicitems/u1-homebrew_bag");
    expect(sent).toMatchObject({ rarity: bagOfHolding.rarity });
  });
});

it("shows the backend's message when saving fails", async () => {
  renderEditor(null, { "POST /api/items": undefined });
  await listsLoaded();
  type(/^Item name/, "Gribble's Rope");

  fireEvent.click(screen.getByRole("button", { name: "Save" })); // no route for the POST: a 404

  expect(await screen.findByRole("alert")).toHaveTextContent("No route for POST /api/items");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});
