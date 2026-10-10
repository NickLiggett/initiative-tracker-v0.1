import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AttackRoller from "./AttackRoller";

/** Dice that give these faces, each on a die of `sides`, in turn. */
function faces(sides, ...numbers) {
  let next = 0;
  return () => (numbers[next++ % numbers.length] - 1) / sides;
}

const CLUB = "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage plus 7 (2d6) fire damage.";
const BREATH = "The dragon exhales fire in a 60-foot cone. Each creature must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save.";

describe("AttackRoller", () => {
  it("shows nothing for an action that has no attack or damage", () => {
    const { container } = render(<AttackRoller name="Move" desc="The aboleth moves up to its swim speed." />);

    expect(container).toBeEmptyDOMElement();
  });

  it("has buttons for the attack, with the bonus, and for damage and a critical hit", () => {
    render(<AttackRoller name="Club" desc={CLUB} />);

    expect(screen.getByRole("button", { name: "Roll attack for Club" })).toHaveTextContent("Attack +6");
    expect(screen.getByRole("button", { name: "Roll attack for Club with advantage" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roll attack for Club with disadvantage" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roll damage for Club" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roll critical damage for Club" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument(); // nothing rolled yet
  });

  it("rolls the attack: a d20 plus the bonus", () => {
    render(<AttackRoller name="Club" desc={CLUB} random={faces(20, 12)} />);

    fireEvent.click(screen.getByRole("button", { name: "Roll attack for Club" }));

    expect(screen.getByRole("status")).toHaveTextContent("Attack 18: d20 12 + 6");
  });

  it("rolls with advantage and with disadvantage, and shows both dice", () => {
    render(<AttackRoller name="Club" desc={CLUB} random={faces(20, 4, 15)} />);

    fireEvent.click(screen.getByRole("button", { name: "Roll attack for Club with advantage" }));
    expect(screen.getByRole("status")).toHaveTextContent("Attack with advantage 21: d20 4, 15 → 15 + 6");

    fireEvent.click(screen.getByRole("button", { name: "Roll attack for Club with disadvantage" }));
    expect(screen.getByRole("status")).toHaveTextContent("Attack with disadvantage 10: d20 4, 15 → 4 + 6");
  });

  it("calls a natural 20 a critical hit and a natural 1 a miss", () => {
    const { rerender } = render(<AttackRoller name="Club" desc={CLUB} random={faces(20, 20)} />);
    fireEvent.click(screen.getByRole("button", { name: "Roll attack for Club" }));
    expect(screen.getByText("Natural 20: a critical hit")).toBeInTheDocument();

    rerender(<AttackRoller name="Club" desc={CLUB} random={faces(20, 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Roll attack for Club" }));
    expect(screen.getByText("Natural 1: a miss")).toBeInTheDocument();
    expect(screen.queryByText("Natural 20: a critical hit")).not.toBeInTheDocument();
  });

  it("rolls each kind of damage, with its dice and the bonus", () => {
    // the same random number gives a 3 on a d8 and a 2 on a d6: 2d8 + 4 = 10, 2d6 = 4
    render(<AttackRoller name="Club" desc={CLUB} random={faces(8, 3)} />);

    fireEvent.click(screen.getByRole("button", { name: "Roll damage for Club" }));

    expect(screen.getByRole("status")).toHaveTextContent("Damage 14: 10 bludgeoning (2d8 + 4: 3, 3) + 4 fire (2d6: 2, 2)");
  });

  it("rolls the dice twice for a critical hit", () => {
    render(<AttackRoller name="Club" desc="Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage." random={faces(6, 2)} />);

    fireEvent.click(screen.getByRole("button", { name: "Roll critical damage for Club" }));

    expect(screen.getByRole("status")).toHaveTextContent("Critical damage 10: 10 slashing (2d6 + 2: 2, 2, 2, 2)");
  });

  it("rolls a flat amount of damage as it is", () => {
    render(<AttackRoller name="Bite" desc="Melee Attack Roll: +4 to hit, reach 5 ft. 1 Piercing damage." />);

    fireEvent.click(screen.getByRole("button", { name: "Roll damage for Bite" }));

    expect(screen.getByRole("status")).toHaveTextContent("Damage 1: 1 piercing");
  });

  it("offers only the damage of an effect with a saving throw, and no critical hit", () => {
    render(<AttackRoller name="Fire Breath" desc={BREATH} random={faces(6, 1)} />);

    expect(screen.queryByRole("button", { name: /Roll attack/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /critical/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Roll damage for Fire Breath" }));

    expect(screen.getByRole("status")).toHaveTextContent("Damage 18: 18 fire (18d6: 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)");
  });

  it("offers the attack alone when it does no damage", () => {
    render(<AttackRoller name="Net" desc="Ranged Weapon Attack: +5 to hit, range 20/60 ft., one creature. Hit: The target is restrained." />);

    expect(screen.getByRole("button", { name: "Roll attack for Net" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /damage/i })).not.toBeInTheDocument();
  });
});
