import { describe, expect, it } from "vitest";
import { averageDamage, describeDamage, parseAction, strongestAttack } from "./attackParse";

// The texts are real ones, from Open5e's sources and the books.

describe("parseAction: the 2014 style", () => {
  it("reads a weapon attack: the bonus, the reach and the damage", () => {
    const parsed = parseAction("Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 10 (1d8 + 6) piercing damage.");

    expect(parsed.attack).toEqual({ kind: "melee", toHit: 12, reach: 5, range: null });
    expect(parsed.damage).toEqual([{ dice: { count: 1, sides: 8, bonus: 6 }, average: 10, type: "piercing" }]);
    expect(parsed.save).toBeNull();
  });

  it("reads the damage that is added: 'plus' and 'and'", () => {
    const plus = parseAction("Melee Weapon Attack: +5 to hit, reach 10 ft., one target. Hit: 13 (2d10 + 2) piercing damage plus 7 (2d6) fire damage.");
    const and = parseAction("Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8+3) bludgeoning damage and 5 (2d4) poison damage.");

    expect(plus.damage.map((term) => [term.average, term.type])).toEqual([[13, "piercing"], [7, "fire"]]);
    expect(and.damage.map((term) => [term.average, term.type])).toEqual([[7, "bludgeoning"], [5, "poison"]]);
    expect(averageDamage(plus.damage)).toBe(20);
  });

  it("reads through the markdown around the words", () => {
    const parsed = parseAction("_Melee Weapon Attack:_ +5 to hit, reach 5 ft., one target. _Hit:_ 7 (1d8+3) bludgeoning damage plus 5 (2d4) poison damage.");

    expect(parsed.attack.toHit).toBe(5);
    expect(parsed.damage).toHaveLength(2);
  });

  it("reads a ranged attack: its normal and long range", () => {
    const parsed = parseAction("Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.");

    expect(parsed.attack).toMatchObject({ kind: "ranged", toHit: 4, reach: null, range: { normal: 80, long: 320 } });
  });

  it("reads one that is either, and a spell attack", () => {
    const either = parseAction("Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one creature. Hit: 3 (1d4 + 1) piercing damage.");
    const spell = parseAction("Ranged Spell Attack: +7 to hit, range 120 ft., one target. Hit: 22 (4d10) force damage.");

    expect(either.attack).toMatchObject({ kind: "melee or ranged", reach: 5, range: { normal: 20, long: 60 } });
    expect(spell.attack).toMatchObject({ kind: "ranged spell", toHit: 7 });
    expect(spell.damage[0]).toEqual({ dice: { count: 4, sides: 10, bonus: 0 }, average: 22, type: "force" });
  });

  it("reads a negative bonus and a period where the colon should be", () => {
    expect(parseAction("Melee Weapon Attack: -1 to hit, reach 5 ft. Hit: 1 (1d2) bludgeoning damage.").attack.toHit).toBe(-1);
    expect(parseAction("Melee Weapon Attack. +5 to hit, reach 5 ft., one target. Hit: 12 (2d8 + 3) slashing damage.").attack.toHit).toBe(5);
  });

  it("reads damage of several types, which it keeps as one term", () => {
    const parsed = parseAction("Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) bludgeoning, piercing, or slashing damage, depending on weapon.");

    expect(parsed.damage).toEqual([{ dice: { count: 1, sides: 10, bonus: 2 }, average: 7, type: "bludgeoning/piercing/slashing" }]);
    expect(parseAction("Hit: 9 (3d4 + 1) bludgeoning or piercing damage.").damage[0].type).toBe("bludgeoning/piercing");
  });

  it("takes only the damage of the hit, not what is rolled later against a save", () => {
    const parsed = parseAction("Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 15 (2d8 + 6) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 14 (4d6) poison damage on a failed save.");

    expect(parsed.damage.map((term) => term.average)).toEqual([15]);
    expect(parsed.save).toEqual({ dc: 15, ability: "constitution" });
  });

  it("gives an attack that does no damage no damage", () => {
    const parsed = parseAction("Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: The target is grappled (escape DC 12).");

    expect(parsed.attack.toHit).toBe(4);
    expect(parsed.damage).toEqual([]);
  });

  it("reads the figure of a text that stops before it says what damage", () => {
    const parsed = parseAction("Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5)");

    expect(parsed.damage).toEqual([{ dice: { count: 2, sides: 8, bonus: 5 }, average: 14, type: "" }]);
    expect(describeDamage(parsed.damage)).toBe("2d8 + 5");
  });
});

describe("parseAction: the 2024 style", () => {
  it("reads an attack roll with a bonus alone, and damage with no 'Hit:'", () => {
    const parsed = parseAction("Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Piercing damage plus 3 (1d6) Necrotic damage.");

    expect(parsed.attack).toEqual({ kind: "melee", toHit: 4, reach: 5, range: null });
    expect(parsed.damage.map((term) => [term.average, term.type])).toEqual([[5, "piercing"], [3, "necrotic"]]);
  });

  it("reads a flat amount of damage", () => {
    const parsed = parseAction("Melee Attack Roll: +4 to hit, reach 5 ft. 1 Piercing damage.");

    expect(parsed.damage).toEqual([{ dice: null, average: 1, type: "piercing" }]);
    expect(describeDamage(parsed.damage)).toBe("1 piercing");
  });

  it("reads the figure when the text leaves it out", () => {
    const parsed = parseAction("Ranged Attack Roll: +5, range 30 ft. (2d6) Fire damage.");

    expect(parsed.damage).toEqual([{ dice: { count: 2, sides: 6, bonus: 0 }, average: 7, type: "fire" }]);
  });
});

describe("parseAction: effects that aren't attacks", () => {
  it("reads a saving throw and the damage of a failed one", () => {
    const parsed = parseAction("The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save, or half as much damage on a successful one.");

    expect(parsed.attack).toBeNull();
    expect(parsed.save).toEqual({ dc: 21, ability: "dexterity" });
    expect(parsed.damage).toEqual([{ dice: { count: 18, sides: 6, bonus: 0 }, average: 63, type: "fire" }]);
  });

  it("finds nothing in an action that is only words", () => {
    expect(parseAction("The aboleth moves up to its swim speed without provoking opportunity attacks.")).toEqual({ attack: null, damage: [], save: null });
    expect(parseAction("The giant makes two greatsword attacks.")).toEqual({ attack: null, damage: [], save: null });
    expect(parseAction(null)).toEqual({ attack: null, damage: [], save: null });
  });

  it("doesn't take a spell or a reaction that mentions attack rolls for an attack", () => {
    expect(parseAction("When a creature hits it with a spell or attack that requires a ranged attack roll, it strikes the attacker.").attack).toBeNull();
  });
});

describe("strongestAttack", () => {
  const creature = {
    actions: [
      { name: "Multiattack", actionType: "ACTION", desc: "The ogre makes two attacks." },
      { name: "Club", actionType: "ACTION", desc: "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage." },
      { name: "Rock", actionType: "ACTION", desc: "Ranged Weapon Attack: +6 to hit, range 30/120 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage." },
      { name: "Legendary Smash", actionType: "LEGENDARY_ACTION", desc: "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 40 (8d8 + 4) bludgeoning damage." },
    ],
  };

  it("is the action that does the most on a hit, among those that are actions", () => {
    expect(strongestAttack(creature)).toEqual({ name: "Club", toHit: 6, average: 13 });
  });

  it("is nothing for a creature with no attacks", () => {
    expect(strongestAttack({ actions: [{ name: "Wail", actionType: "ACTION", desc: "Each creature within 30 feet must make a DC 13 Wisdom saving throw." }] })).toBeNull();
    expect(strongestAttack({})).toBeNull();
    expect(strongestAttack(null)).toBeNull();
  });
});
