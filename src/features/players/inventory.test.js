import { describe, expect, it } from "vitest";
import { inventoryProblems, newLine, summarize, toInventoryDraft, toInventoryRequest } from "./inventory";

const stored = {
  platinum: 2,
  gold: 15,
  silver: 0,
  copper: 7,
  items: [
    { itemKey: "srd_rope", kind: "ITEM", name: "Rope", quantity: 2, equipped: false, attuned: false, notes: null },
    { itemKey: null, kind: null, name: "Locket", quantity: 1, equipped: true, attuned: false, notes: "Grandfather's" },
  ],
};

describe("toInventoryDraft and toInventoryRequest", () => {
  it("keep what was stored, as text while editing", () => {
    const draft = toInventoryDraft(stored);

    expect(draft).toMatchObject({ platinum: "2", gold: "15", silver: "0", copper: "7" });
    expect(draft.items[0]).toMatchObject({ itemKey: "srd_rope", quantity: "2", notes: "" });
    expect(toInventoryRequest(draft)).toEqual({
      platinum: 2,
      gold: 15,
      silver: 0,
      copper: 7,
      items: [
        { itemKey: "srd_rope", kind: "ITEM", name: "Rope", quantity: 2, equipped: false, attuned: false, notes: null },
        { itemKey: null, kind: null, name: "Locket", quantity: 1, equipped: true, attuned: false, notes: "Grandfather's" },
      ],
    });
  });
});

describe("newLine", () => {
  it("is a line for what was typed, or for an item found", () => {
    expect(newLine("  Torch ")).toMatchObject({ name: "Torch", itemKey: null, kind: null, quantity: "1" });
    expect(newLine({ key: "srd_rope", name: "Rope" })).toMatchObject({ name: "Rope", itemKey: "srd_rope", kind: "ITEM" });
    expect(newLine({ key: "srd_cloak", name: "Cloak", rarity: "rare", requiresAttunement: true })).toMatchObject({ kind: "MAGIC" });
  });

  it("gives each line a key of its own", () => {
    expect(newLine("A").id).not.toBe(newLine("A").id);
  });
});

describe("inventoryProblems", () => {
  const ok = () => toInventoryDraft(stored);

  it("is none for a good inventory, and for an empty one", () => {
    expect(inventoryProblems(ok())).toEqual([]);
    expect(inventoryProblems(toInventoryDraft({}))).toEqual([]);
  });

  it("keeps coins to whole numbers, 0 or more", () => {
    expect(inventoryProblems({ ...ok(), platinum: "x" })).toEqual(["Platinum must be 0 to 9999999."]);
    expect(inventoryProblems({ ...ok(), gold: "-1" })).toEqual(["Gold must be 0 to 9999999."]);
    expect(inventoryProblems({ ...ok(), silver: "" })).toEqual(["Silver must be 0 to 9999999."]);
    expect(inventoryProblems({ ...ok(), copper: "2.5" })).toEqual(["Copper must be 0 to 9999999."]);
  });

  it("wants each line named, with a sensible quantity", () => {
    const draft = ok();

    expect(inventoryProblems({ ...draft, items: [{ ...draft.items[0], name: "  " }] })).toEqual(["Give each line a name."]);
    expect(inventoryProblems({ ...draft, items: [{ ...draft.items[0], quantity: "0" }] })).toEqual(["The quantity of Rope must be 1 to 9999."]);
  });

  it("allows three attuned items, and no more", () => {
    const attuned = (count) => ({ ...ok(), items: Array.from({ length: count }, () => ({ ...newLine("Ring"), attuned: true })) });

    expect(inventoryProblems(attuned(3))).toEqual([]);
    expect(inventoryProblems(attuned(4))).toEqual(["At most 3 items can be attuned."]);
  });
});

describe("summarize", () => {
  it("counts the lines and the attuned ones", () => {
    expect(summarize(toInventoryDraft({}))).toBe("");
    expect(summarize(toInventoryDraft(stored))).toBe("2 lines");
    expect(summarize({ items: [{ attuned: true }] })).toBe("1 line, 1 attuned");
  });
});
