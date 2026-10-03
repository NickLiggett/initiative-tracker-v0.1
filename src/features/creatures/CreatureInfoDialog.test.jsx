import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import CreatureInfoDialog from "./CreatureInfoDialog";

function openDialog() {
  render(<CreatureInfoDialog open onClose={() => {}} creature={dragon} />);
  return screen.getByRole("dialog");
}

describe("CreatureInfoDialog", () => {
  it("shows the creature's name, source and key stats", () => {
    const dialog = openDialog();

    expect(within(dialog).getByText("Adult Red Dragon")).toBeInTheDocument();
    expect(within(dialog).getByText("5e 2014 Rules")).toBeInTheDocument();
    expect(within(dialog).getByText("Huge Dragon (Dragons, Chromatic), Chaotic Evil")).toBeInTheDocument();
    expect(within(dialog).getByText("256 (19d12+133)")).toBeInTheDocument();
    expect(within(dialog).getByText("19 (natural armor)")).toBeInTheDocument();
    expect(within(dialog).getByText("Walk 40 ft., Fly 80 ft., Swim 20 ft., Climb 40 ft., Crawl 20 ft.")).toBeInTheDocument();
    expect(within(dialog).getByText("17 (18,000 XP)")).toBeInTheDocument();
    expect(within(dialog).getByText("+6")).toBeInTheDocument(); // proficiency bonus, worked out from the CR
  });

  it("shows ability scores with saves, skills, senses and immunities", () => {
    const dialog = openDialog();

    expect(within(dialog).getByText("27")).toBeInTheDocument(); // strength
    expect(within(dialog).getByText("Save +6")).toBeInTheDocument(); // dexterity, proficient
    expect(within(dialog).getByText(/Perception \+13/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Darkvision 120 ft\./)).toBeInTheDocument();
    expect(within(dialog).getByText("Fire")).toBeInTheDocument(); // damage immunities
  });

  it("lists traits and groups actions by type, with usage limits and legendary costs", () => {
    const dialog = openDialog();

    expect(within(dialog).getByText("Legendary Resistance (3/Day)")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Actions" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Legendary Actions" })).toBeInTheDocument();
    expect(within(dialog).getByText("Multiattack")).toBeInTheDocument();
    expect(within(dialog).getByText(/Fire Breath \(Recharge 5–6\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Wing Attack \(costs 2 actions\)/)).toBeInTheDocument();
  });
});
