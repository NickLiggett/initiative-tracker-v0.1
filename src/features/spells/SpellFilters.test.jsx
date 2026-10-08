import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SpellFilters, { NO_FILTERS, classChoices, searchFilters } from "./SpellFilters";

const classes = [
  { key: "srd_wizard", name: "Wizard" },
  { key: "srd-2024_wizard", name: "Wizard" },
  { key: "srd_cleric", name: "Cleric" },
];

describe("classChoices", () => {
  it("is one choice for a class under several rules, with all its keys, by name", () => {
    expect(classChoices(classes)).toEqual([
      { name: "Cleric", keys: ["srd_cleric"] },
      { name: "Wizard", keys: ["srd_wizard", "srd-2024_wizard"] },
    ]);
  });
});

describe("searchFilters", () => {
  it("asks for everything when nothing is chosen", () => {
    expect(searchFilters(NO_FILTERS, classes)).toEqual({
      level: undefined,
      school: undefined,
      classKeys: [],
      damageType: undefined,
      concentration: undefined,
      ritual: undefined,
    });
  });

  it("turns the choices into what the search takes, a level of 0 included", () => {
    const chosen = { level: "0", school: "evocation", className: "Wizard", damageType: "fire", concentration: true, ritual: true };

    expect(searchFilters(chosen, classes)).toEqual({
      level: 0,
      school: "evocation",
      classKeys: ["srd_wizard", "srd-2024_wizard"],
      damageType: "fire",
      concentration: true,
      ritual: true,
    });
  });

  it("asks for no class when the one chosen isn't in the list", () => {
    expect(searchFilters({ ...NO_FILTERS, className: "Artificer" }, classes).classKeys).toEqual([]);
  });
});

describe("SpellFilters", () => {
  const lists = {
    schools: [{ key: "evocation", name: "Evocation" }],
    classes,
    damageTypes: [{ key: "fire", name: "Fire" }],
  };

  it("offers each filter, with Any, and the levels from cantrip to 9th", () => {
    render(<SpellFilters filters={NO_FILTERS} onChange={vi.fn()} {...lists} />);

    const level = screen.getByLabelText("Level");
    expect([...level.options].map((option) => option.textContent)).toEqual([
      "Any", "Cantrip", "1st level", "2nd level", "3rd level", "4th level", "5th level", "6th level", "7th level", "8th level", "9th level",
    ]);
    expect([...screen.getByLabelText("School").options].map((option) => option.textContent)).toEqual(["Any", "Evocation"]);
    expect([...screen.getByLabelText("Class").options].map((option) => option.textContent)).toEqual(["Any", "Cleric", "Wizard"]);
    expect([...screen.getByLabelText("Damage").options].map((option) => option.textContent)).toEqual(["Any", "Fire"]);
  });

  it("reports a choice, keeping the others", () => {
    const onChange = vi.fn();
    render(<SpellFilters filters={{ ...NO_FILTERS, school: "evocation" }} onChange={onChange} {...lists} />);

    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });

    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, school: "evocation", level: "3" });
  });

  it("toggles concentration and ritual", () => {
    const onChange = vi.fn();
    render(<SpellFilters filters={{ ...NO_FILTERS, ritual: true }} onChange={onChange} {...lists} />);

    fireEvent.click(screen.getByRole("button", { name: "Concentration" }));
    fireEvent.click(screen.getByRole("button", { name: "Ritual" }));

    expect(onChange).toHaveBeenNthCalledWith(1, { ...NO_FILTERS, ritual: true, concentration: true });
    expect(onChange).toHaveBeenNthCalledWith(2, { ...NO_FILTERS, ritual: false });
    expect(screen.getByRole("button", { name: "Ritual" })).toHaveAttribute("aria-pressed", "true");
  });
});
