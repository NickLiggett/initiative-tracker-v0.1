import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { buildColumns } from "./trackerColumns";

const handlers = (overrides = {}) => ({
  combatants: [],
  onReactionChange: vi.fn(),
  onDelete: vi.fn(),
  onShowCreature: vi.fn(),
  onShowPlayer: vi.fn(),
  onRevealChange: vi.fn(),
  ...overrides,
});

// The grid only draws the columns that fit its width, which a test browser doesn't have, so the cell is drawn here.
const revealCell = (columns, row) => columns.find((column) => column.field === "revealed").renderCell({ row });

describe("the Players see column", () => {
  const goblin = { id: 3, name: "Goblin", type: "Creature", playerId: undefined };

  it("offers to reveal a hidden monster's AC and HP, and says what it does", () => {
    const onRevealChange = vi.fn();
    render(revealCell(buildColumns(handlers({ onRevealChange })), goblin));

    fireEvent.click(screen.getByRole("button", { name: "Reveal AC and HP for Goblin" }));

    expect(onRevealChange).toHaveBeenCalledWith(3, true);
  });

  it("offers to hide a revealed one", () => {
    const onRevealChange = vi.fn();
    render(revealCell(buildColumns(handlers({ onRevealChange })), { ...goblin, revealed: true }));

    fireEvent.click(screen.getByRole("button", { name: "Hide AC and HP of Goblin" }));

    expect(onRevealChange).toHaveBeenCalledWith(3, false);
  });

  it("offers nothing for a character: the party always sees theirs", () => {
    expect(revealCell(buildColumns(handlers()), { id: 1, name: "Gribble", type: "PC" })).toBeNull();
    expect(revealCell(buildColumns(handlers()), { id: 2, name: "Hero", type: "NPC", playerId: 9 })).toBeNull();
  });
});
