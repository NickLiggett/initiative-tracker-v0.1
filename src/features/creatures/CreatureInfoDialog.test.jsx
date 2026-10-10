import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  describe("rolling its actions", () => {
    afterEach(() => vi.restoreAllMocks());

    it("has buttons for the attacks and the damage of its actions, read from their text, and none for its traits", () => {
      const dialog = openDialog();

      expect(within(dialog).getByRole("button", { name: "Roll attack for Bite" })).toHaveTextContent("Attack +14");
      expect(within(dialog).getByRole("button", { name: "Roll damage for Bite" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Roll damage for Fire Breath" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: /Legendary Resistance/ })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: /Multiattack/ })).not.toBeInTheDocument();
    });

    it("rolls an attack with the creature's bonus", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // a d20 of 11
      const dialog = openDialog();

      fireEvent.click(within(dialog).getByRole("button", { name: "Roll attack for Bite" }));

      expect(within(dialog).getByRole("status")).toHaveTextContent("Attack 25: d20 11 + 14");
    });
  });
});
