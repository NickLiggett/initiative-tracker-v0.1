import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import PlayerSheetDialog from "./PlayerSheetDialog";
import { buildColumns } from "./trackerColumns";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 1, name: "Thorin", ruleset: "5e-2014", className: "Fighter", speciesName: "Dwarf", level: 6,
  armorClass: 18, hitPoints: 52, initiativeBonus: 1, notes: "Carries a grudge", owner: "dev", playedBy: null, role: "OWNER",
};

describe("PlayerSheetDialog", () => {
  it("shows the player as they are now", async () => {
    stubApi({ "GET /api/players/1": thorin });
    render(<PlayerSheetDialog playerId={1} name="Thorin" onClose={vi.fn()} />);

    const dialog = within(screen.getByRole("dialog"));
    expect(await dialog.findByText("Level 6 Fighter · Dwarf")).toBeInTheDocument();
    expect(dialog.getByText("Carries a grudge")).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument(); // a card to read, not to change
  });

  it("closes", async () => {
    stubApi({ "GET /api/players/1": thorin });
    const onClose = vi.fn();
    render(<PlayerSheetDialog playerId={1} name="Thorin" onClose={onClose} />);
    await screen.findByText("Level 6 Fighter · Dwarf");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("says so when the player can't be found any more", async () => {
    stubApi({ "GET /api/players/1": () => new Response(JSON.stringify({ detail: "No player 1" }), { status: 404 }) });
    render(<PlayerSheetDialog playerId={1} name="Thorin" onClose={vi.fn()} />);

    expect(await screen.findByText("Thorin isn't there any more, or isn't shared with you now.")).toBeInTheDocument();
  });

  it("says so when it can't load", async () => {
    stubApi({ "GET /api/players/1": () => new Response("{}", { status: 500 }) });
    render(<PlayerSheetDialog playerId={1} name="Thorin" onClose={vi.fn()} />);

    expect(await screen.findByText("Couldn't load this player.")).toBeInTheDocument();
  });
});

describe("the tracker's action column", () => {
  const actions = (row, handlers = {}) => {
    const column = buildColumns({ combatants: [row], onReactionChange: vi.fn(), onDelete: vi.fn(), onShowCreature: vi.fn(), onShowPlayer: vi.fn(), ...handlers }).find(
      (c) => c.field === "delete",
    );
    return render(column.renderCell({ row }));
  };

  it("has a card for a player, which opens that combatant", () => {
    const onShowPlayer = vi.fn();
    const row = { id: 3, name: "Thorin", playerId: 1, creature: null };
    actions(row, { onShowPlayer });

    fireEvent.click(screen.getByLabelText("Thorin Information"));

    expect(onShowPlayer).toHaveBeenCalledWith(row);
  });

  it("has none for a combatant typed by hand", () => {
    actions({ id: 3, name: "Goblin", creature: null });

    expect(screen.queryByLabelText("Goblin Information")).not.toBeInTheDocument();
  });
});
