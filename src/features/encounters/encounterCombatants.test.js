import { describe, expect, it } from "vitest";
import { byInitiative, monsterCombatants, playerCombatants } from "./encounterCombatants";

const goblin = { key: "srd_goblin", name: "Goblin", armorClass: 15, hitPoints: 7, initiativeBonus: 2 };
const dragon = { key: "srd_dragon", name: "Young Dragon", armorClass: 18, hitPoints: 150, initiativeBonus: 0 };

/** Dice that give these numbers (as 0 to 1 fractions: n/20 rolls n+1) in turn. */
function dice(...faces) {
  let next = 0;
  return () => (faces[next++ % faces.length] - 1) / 20;
}

describe("monsterCombatants", () => {
  it("makes one combatant for each monster, with its armor class, hit points and stat block", () => {
    const [only] = monsterCombatants([{ creature: dragon, count: 1 }], { random: dice(10) });

    expect(only).toEqual({ initiative: 10, name: "Young Dragon", ac: 18, hp: 150, reaction: false, type: "Creature", creature: dragon });
  });

  it("numbers a kind that has several", () => {
    const names = monsterCombatants([{ creature: goblin, count: 3 }, { creature: dragon, count: 1 }]).map((one) => one.name);

    expect(names).toEqual(["Goblin 1", "Goblin 2", "Goblin 3", "Young Dragon"]);
  });

  it("rolls once for each kind, plus its bonus, so they all go together", () => {
    const made = monsterCombatants([{ creature: goblin, count: 3 }, { creature: dragon, count: 1 }], { random: dice(10, 4) });

    expect(made.map((one) => one.initiative)).toEqual([12, 12, 12, 4]);
  });

  it("rolls for each one when asked to", () => {
    const made = monsterCombatants([{ creature: goblin, count: 3 }], { separately: true, random: dice(99, 5, 10, 20) });

    expect(made.map((one) => one.initiative)).toEqual([7, 12, 22]); // the first roll is the shared one, unused
  });

  it("leaves what the creature doesn't say blank", () => {
    const [made] = monsterCombatants([{ creature: { name: "Blob" }, count: 1 }], { random: dice(1) });

    expect(made).toMatchObject({ ac: "", hp: "", initiative: 1 });
  });
});

describe("playerCombatants", () => {
  it("makes a player character combatant for each, rolling with their bonus, remembering which player", () => {
    const made = playerCombatants([{ id: 7, name: "Ana", armorClass: 16, hitPoints: 30, initiativeBonus: 3 }], { random: dice(10) });

    expect(made).toEqual([{ initiative: 13, name: "Ana", ac: 16, hp: 30, reaction: false, type: "PC", creature: null, playerId: 7 }]);
  });
});

describe("byInitiative", () => {
  it("puts the highest first, and keeps those that tie in the order they came", () => {
    const order = byInitiative([{ name: "a", initiative: 5 }, { name: "b", initiative: 12 }, { name: "c", initiative: 5 }, { name: "d", initiative: 12 }]);

    expect(order.map((one) => one.name)).toEqual(["b", "d", "a", "c"]);
  });
});
