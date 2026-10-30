// What a character carries, while it's being edited, and back to what the backend takes. Numbers are kept as the text
// typed, so a field can be empty or half typed.

import { isMagicItem } from "../../api/items";

export const MAX_LINES = 200;
export const MAX_ATTUNED = 3;
const MAX_COINS = 9999999;
const MAX_QUANTITY = 9999;

let lastId = 0;
/** A key for a line while it is on screen; lines have no id of their own until saved. */
const lineId = () => ++lastId;

export const COINS = [
  { field: "platinum", label: "Platinum (pp)" },
  { field: "gold", label: "Gold (gp)" },
  { field: "silver", label: "Silver (sp)" },
  { field: "copper", label: "Copper (cp)" },
];

/** A line for something typed by hand, or (given an Open5e item) for that item. */
export function newLine(item) {
  return {
    id: lineId(),
    itemKey: null,
    kind: null,
    name: "",
    quantity: "1",
    equipped: false,
    attuned: false,
    notes: "",
    ...(typeof item === "string" ? { name: item.trim() } : item ? { itemKey: item.key, kind: isMagicItem(item) ? "MAGIC" : "ITEM", name: item.name } : {}),
  };
}

/** The draft for what the backend gave. */
export function toInventoryDraft(inventory) {
  return {
    platinum: String(inventory.platinum ?? 0),
    gold: String(inventory.gold ?? 0),
    silver: String(inventory.silver ?? 0),
    copper: String(inventory.copper ?? 0),
    items: (inventory.items ?? []).map((line) => ({
      id: lineId(),
      itemKey: line.itemKey ?? null,
      kind: line.kind ?? null,
      name: line.name,
      quantity: String(line.quantity),
      equipped: Boolean(line.equipped),
      attuned: Boolean(line.attuned),
      notes: line.notes ?? "",
    })),
  };
}

function whole(text) {
  const trimmed = String(text).trim();
  return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
}

/** What stops this inventory from being saved: sentences, none when it can be. */
export function inventoryProblems(draft) {
  const problems = [];
  for (const { field, label } of COINS) {
    const value = whole(draft[field]);
    if (Number.isNaN(value) || value > MAX_COINS) {
      problems.push(`${label.replace(/ \(.*\)/, "")} must be 0 to ${MAX_COINS}.`);
    }
  }
  if (draft.items.length > MAX_LINES) {
    problems.push(`There can be ${MAX_LINES} lines at most.`);
  }
  for (const line of draft.items) {
    const quantity = whole(line.quantity);
    if (!line.name.trim()) {
      problems.push("Give each line a name.");
    } else if (Number.isNaN(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      problems.push(`The quantity of ${line.name.trim()} must be 1 to ${MAX_QUANTITY}.`);
    }
  }
  if (draft.items.filter((line) => line.attuned).length > MAX_ATTUNED) {
    problems.push(`At most ${MAX_ATTUNED} items can be attuned.`);
  }
  return [...new Set(problems)];
}

/** The body to send the backend. Call it only when `inventoryProblems` is empty. */
export function toInventoryRequest(draft) {
  return {
    platinum: whole(draft.platinum),
    gold: whole(draft.gold),
    silver: whole(draft.silver),
    copper: whole(draft.copper),
    items: draft.items.map((line) => ({
      itemKey: line.itemKey,
      kind: line.itemKey ? line.kind : null,
      name: line.name.trim(),
      quantity: whole(line.quantity),
      equipped: line.equipped,
      attuned: line.attuned,
      notes: line.notes.trim() || null,
    })),
  };
}

/** "3 items, 2 attuned" for a heading, or nothing for none. */
export function summarize(draft) {
  const count = draft.items.length;
  const attuned = draft.items.filter((line) => line.attuned).length;
  return [count ? `${count} ${count === 1 ? "line" : "lines"}` : null, attuned ? `${attuned} attuned` : null].filter(Boolean).join(", ");
}
