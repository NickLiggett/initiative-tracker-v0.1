import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SheetAbilities from "./SheetAbilities";
import SheetFields, { SheetDescription } from "./SheetFields";

describe("the sheet's fields", () => {
  const sheet = {
    abilities: { str: 12, dex: 20, con: 18, int: 12, wis: 16, cha: 10 },
    saves: ["dex", "int"],
    skills: { stealth: "expertise", perception: "proficient" },
    speed: { walk: 35 },
    senses: ["Darkvision 120 ft."],
    defenses: { resistances: ["necrotic"] },
    personal: { alignment: "Chaotic Good", backstory: "Long ago..." },
  };

  it("works out the modifiers, saves, skills and passive scores from the scores and the level", () => {
    render(
      <>
        <SheetAbilities sheet={sheet} level={14} />
        <SheetFields sheet={sheet} level={14} />
        <SheetDescription sheet={sheet} />
      </>,
    );

    expect(screen.getByLabelText("Dexterity")).toHaveTextContent("+5");
    expect(screen.getByLabelText("Dexterity")).toHaveTextContent("20");
    expect(screen.getByText("Proficiency bonus +5")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Saving throws" })).getByText("Dexterity").closest("div")).toHaveTextContent("+10");
    expect(screen.getByText("Stealth (DEX)").closest("div")).toHaveTextContent("+15");
    expect(screen.getByText("Passive Perception").closest("div")).toHaveTextContent("18");
    expect(screen.getByText("Walking 35 ft.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Resistances" })).toHaveTextContent("necrotic");
    expect(screen.getByText("Alignment: Chaotic Good")).toBeInTheDocument();
    expect(screen.getByText("Long ago...")).toBeInTheDocument();
  });

  it("includes what was adjusted by hand in the number, and says so beside it", () => {
    render(<SheetFields sheet={{ ...sheet, adjustments: { "save.dex": { bonus: 1, note: "Cloak of Protection" }, "skill.religion": { note: "Advantage" } } }} level={14} />);

    const saves = within(screen.getByRole("region", { name: "Saving throws" }));
    expect(saves.getByText("Dexterity").closest("div")).toHaveTextContent("+11");
    expect(saves.getByLabelText("Adjusted: +1 Cloak of Protection")).toBeInTheDocument();
    expect(screen.getByLabelText("Adjusted: Advantage")).toBeInTheDocument();
  });

  it("shows nothing for a sheet that is empty", () => {
    const { container } = render(<SheetFields sheet={{}} level={1} />);

    expect(container).toBeEmptyDOMElement();
  });
});
