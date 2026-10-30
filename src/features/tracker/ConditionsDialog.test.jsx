import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ConditionsDialog from "./ConditionsDialog";

const goblin = { id: 3, name: "Goblin", conditions: ["Prone"] };

describe("the conditions of a row", () => {
  it("starts with the ones the row has, and saves the ones chosen in the usual order", () => {
    const onSave = vi.fn();
    render(<ConditionsDialog combatant={goblin} onSave={onSave} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Prone" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Stunned" }));
    fireEvent.click(screen.getByRole("button", { name: "Blinded" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(["Blinded", "Prone", "Stunned"]);
  });

  it("turns one off with a second tap, and can leave a row with none", () => {
    const onSave = vi.fn();
    render(<ConditionsDialog combatant={goblin} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Prone" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith([]);
  });

  it("says a character's conditions are kept on the character, and a creature's are not", () => {
    const { rerender } = render(<ConditionsDialog combatant={{ ...goblin, playerId: 7 }} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/kept on the character too/)).toBeInTheDocument();

    rerender(<ConditionsDialog combatant={goblin} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(/kept on the character too/)).not.toBeInTheDocument();
  });

  it("changes nothing when cancelled", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ConditionsDialog combatant={goblin} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
