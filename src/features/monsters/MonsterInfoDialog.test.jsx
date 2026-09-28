import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import MonsterInfoDialog from "./MonsterInfoDialog";

function openDialog() {
  render(<MonsterInfoDialog open onClose={() => {}} creature={dragon} />);
  return screen.getByRole("dialog");
}

describe("MonsterInfoDialog", () => {
  it("shows the creature's name, source and general stats", () => {
    const dialog = openDialog();

    expect(within(dialog).getByText("Adult Red Dragon")).toBeInTheDocument();
    expect(within(dialog).getByText("5e 2014 Rules")).toBeInTheDocument();
    expect(within(dialog).getByText("256")).toBeInTheDocument();
    expect(within(dialog).getByText("19 (natural armor)")).toBeInTheDocument();
    expect(within(dialog).getByText("Walk 40 ft., Fly 80 ft., Climb 40 ft.")).toBeInTheDocument();
    expect(within(dialog).getByText("Dragon")).toBeInTheDocument();
    expect(within(dialog).getByText("Fire")).toBeInTheDocument(); // damage immunities
  });

  it("shows ability scores, proficiencies and senses", () => {
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Skills" }));

    expect(within(dialog).getByText("27 (+8)")).toBeInTheDocument(); // strength
    expect(within(dialog).getByText(/Saving Throws: .*Dexterity \+6/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Skills: .*Perception \+13/)).toBeInTheDocument();
    expect(within(dialog).getByText("Darkvision: 120 ft.")).toBeInTheDocument();
    expect(within(dialog).getByText("Legendary Resistance (3/Day)")).toBeInTheDocument();
  });

  it("groups actions by type, with usage limits and legendary costs", () => {
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Actions" }));

    expect(within(dialog).getByText("Actions:")).toBeInTheDocument();
    expect(within(dialog).getByText("Legendary Actions:")).toBeInTheDocument();
    expect(within(dialog).getByText("1. Multiattack")).toBeInTheDocument();
    expect(within(dialog).getByText(/Fire Breath \(Recharge 5–6\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Wing Attack \(costs 2 actions\)/)).toBeInTheDocument();
  });
});
