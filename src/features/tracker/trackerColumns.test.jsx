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
  onRevealAllChange: vi.fn(),
  ...overrides,
});

// The grid only draws the columns that fit its width, which a test browser doesn't have, so the cell is drawn here.
const cell = (columns, field, row) => columns.find((column) => column.field === field).renderCell({ row });
const header = (columns, field) => columns.find((column) => column.field === field).renderHeader();

describe("hiding a field from the players", () => {
  const goblin = { id: 3, name: "Goblin", type: "Creature", playerId: undefined, ac: 15, hp: 7 };

  it("offers to reveal a hidden monster's AC, HP and name, one at a time", () => {
    const onRevealChange = vi.fn();
    const columns = buildColumns(handlers({ onRevealChange }));

    render(<div>{cell(columns, "ac", goblin)}{cell(columns, "hp", goblin)}</div>);
    fireEvent.click(screen.getByRole("button", { name: "Reveal AC for Goblin" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal HP for Goblin" }));

    expect(onRevealChange).toHaveBeenNthCalledWith(1, 3, "ac", true);
    expect(onRevealChange).toHaveBeenNthCalledWith(2, 3, "hp", true);
  });

  it("offers to hide what is shown: a shown name, a revealed AC, and both when the old single flag was set", () => {
    const onRevealChange = vi.fn();
    const columns = buildColumns(handlers({ onRevealChange }));

    render(<div>{cell(columns, "name", goblin)}{cell(columns, "ac", { ...goblin, acRevealed: true })}{cell(columns, "hp", { ...goblin, revealed: true })}</div>);
    fireEvent.click(screen.getByRole("button", { name: "Hide name of Goblin" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide AC of Goblin" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide HP of Goblin" }));

    expect(onRevealChange.mock.calls).toEqual([[3, "name", false], [3, "ac", false], [3, "hp", false]]);
  });

  it("offers nothing for a character: the party always sees theirs", () => {
    const columns = buildColumns(handlers());
    for (const row of [{ id: 1, name: "Gribble", type: "PC" }, { id: 2, name: "Hero", type: "NPC", playerId: 9 }]) {
      render(<div>{cell(columns, "name", row)}{cell(columns, "ac", row)}</div>);
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has a heading toggle that reveals the field for every monster, or hides it once all are shown", () => {
    const onRevealAllChange = vi.fn();
    const hero = { id: 1, name: "Hero", type: "PC" };
    const hidden = buildColumns(handlers({ onRevealAllChange, combatants: [hero, goblin] }));

    const { unmount } = render(header(hidden, "ac"));
    fireEvent.click(screen.getByRole("button", { name: "Reveal AC for all monsters" }));
    expect(onRevealAllChange).toHaveBeenCalledWith("ac", true);
    unmount();

    const shown = buildColumns(handlers({ onRevealAllChange, combatants: [hero, { ...goblin, acRevealed: true }] }));
    render(header(shown, "ac"));
    fireEvent.click(screen.getByRole("button", { name: "Hide AC for all monsters" }));
    expect(onRevealAllChange).toHaveBeenLastCalledWith("ac", false);
  });

  it("has no heading toggle when there is no monster to hide", () => {
    render(header(buildColumns(handlers({ combatants: [{ id: 1, name: "Hero", type: "PC" }] })), "hp"));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("the conditions column", () => {
  const goblin = { id: 3, name: "Goblin", type: "Creature", ac: 15, hp: 7, conditions: ["Prone", "Poisoned"] };

  it("shows a row's conditions as chips, and opens the choice when it is clicked", () => {
    const onEditConditions = vi.fn();
    const columns = buildColumns(handlers({ onEditConditions, visible: ["initiative", "name", "conditions"] }));

    render(cell(columns, "conditions", goblin));
    fireEvent.click(screen.getByRole("button", { name: "Conditions of Goblin: Prone, Poisoned" }));

    expect(screen.getByText("Prone")).toBeInTheDocument();
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
    expect(onEditConditions).toHaveBeenCalledWith(goblin);
  });

  it("says none for a row with no conditions, and still opens the choice", () => {
    const onEditConditions = vi.fn();
    const columns = buildColumns(handlers({ onEditConditions, visible: ["initiative", "name", "conditions"] }));

    render(cell(columns, "conditions", { ...goblin, conditions: undefined }));
    fireEvent.click(screen.getByRole("button", { name: "Conditions of Goblin: none" }));

    expect(screen.getByText("None")).toBeInTheDocument();
    expect(onEditConditions).toHaveBeenCalled();
  });
});
