import { describe, expect, it } from "vitest";
import { armorClassOf, initiativeOf, unarmedStrike } from "./sheetDerived";

const sheet = (abilities = {}, adjustments) => ({ abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...abilities }, ...(adjustments && { adjustments }) });
const armor = (acBase, { dex = false, cap = null, category = "light" } = {}) => ({ category: { key: category }, armor: { acBase, acAddDexmod: dex, acCapDexmod: cap } });
const shield = { category: { key: "shield" }, armor: { acBase: 2, acAddDexmod: false, acCapDexmod: null } };

describe("armor class", () => {
  it("is 10 + Dex with nothing worn", () => {
    expect(armorClassOf(sheet({ dex: 16 }), ["Wizard"], [])).toBe(13);
    expect(armorClassOf(sheet({ dex: 8 }), [], [])).toBe(9);
    expect(armorClassOf({}, [], [])).toBe(10); // no abilities written: all 10
  });

  it("takes the armor's base, plus Dex as far as the armor allows", () => {
    expect(armorClassOf(sheet({ dex: 18 }), [], [armor(11, { dex: true })])).toBe(15); // leather
    expect(armorClassOf(sheet({ dex: 18 }), [], [armor(14, { dex: true, cap: 2, category: "medium" })])).toBe(16); // half plate
    expect(armorClassOf(sheet({ dex: 18 }), [], [armor(18, { category: "heavy" })])).toBe(18); // plate: no Dex
    expect(armorClassOf(sheet({ dex: 6 }), [], [armor(14, { dex: true, cap: 2 })])).toBe(12); // a penalty is not capped
  });

  it("uses the best of several body armors, and counts one shield", () => {
    const worn = [armor(11, { dex: true }), armor(16, { category: "heavy" }), shield, shield];
    expect(armorClassOf(sheet({ dex: 14 }), [], worn)).toBe(18);
  });

  it("gives a shield with no value of its own two", () => {
    expect(armorClassOf(sheet(), [], [{ category: { key: "shield" }, armor: { acBase: 0 } }])).toBe(12);
  });

  it("works out a Barbarian's and a Monk's unarmored defense, which armor and a shield take away", () => {
    const stats = { dex: 14, con: 16, wis: 16 };
    expect(armorClassOf(sheet(stats), ["Barbarian"], [])).toBe(15);
    expect(armorClassOf(sheet(stats), ["Barbarian"], [shield])).toBe(17);
    expect(armorClassOf(sheet(stats), ["Monk"], [])).toBe(15);
    expect(armorClassOf(sheet(stats), ["Monk"], [shield])).toBe(14); // the shield costs the Monk's Wisdom
    expect(armorClassOf(sheet(stats), ["Barbarian"], [armor(14, { category: "medium", dex: true, cap: 2 })])).toBe(16);
  });

  it("is the best of a multiclass's ways of being unarmored", () => {
    expect(armorClassOf(sheet({ dex: 14, con: 16, wis: 18 }), ["Fighter", "Monk", "Barbarian"], [])).toBe(16);
  });

  it("adds the adjustment of armor class", () => {
    expect(armorClassOf(sheet({ dex: 14 }, { ac: { bonus: 1, note: "Ring of Protection" } }), [], [armor(16)])).toBe(17);
  });

  it("leaves out an item that is not armor", () => {
    expect(armorClassOf(sheet(), [], [{ category: { key: "weapon" }, armor: null }, null])).toBe(10);
  });
});

describe("initiative", () => {
  it("is the Dex modifier and its adjustment", () => {
    expect(initiativeOf(sheet({ dex: 14 }))).toBe(2);
    expect(initiativeOf(sheet({ dex: 8 }, { initiative: { bonus: 5 } }))).toBe(4);
    expect(initiativeOf({})).toBe(0);
  });
});

describe("the unarmed strike", () => {
  it("hits with Strength and proficiency, for 1 + Strength modifier bludgeoning", () => {
    expect(unarmedStrike(sheet({ str: 16 }), 5, "5e-2014")).toMatchObject({ name: "Unarmed Strike", bonus: "+6", damage: "4 bludgeoning" });
    expect(unarmedStrike(sheet({ str: 8 }), 1, "5e-2014")).toMatchObject({ bonus: "+1", damage: "0 bludgeoning" });
  });

  it("does no less than none damage, and works with no abilities written", () => {
    expect(unarmedStrike(sheet({ str: 3 }), 1, "5e-2014").damage).toBe("0 bludgeoning");
    expect(unarmedStrike({}, 9, "5e-2014")).toMatchObject({ bonus: "+4", damage: "1 bludgeoning" });
  });

  it("can grapple or shove instead under the 2024 rules, against a save DC, and not under the 2014 rules", () => {
    expect(unarmedStrike(sheet({ str: 16 }), 5, "5e-2024").notes).toContain("DC 14"); // 8 + 3 + 3
    expect(unarmedStrike(sheet({ str: 16 }), 5, "5e-2014").notes).not.toContain("DC");
  });
});

