import { describe, expect, it } from "vitest";
import { armorClassOf, classWeaponTraining, initiativeOf, unarmedStrike, weaponAttacks } from "./sheetDerived";

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


const prop = (name, detail = null, type = null) => ({ property: { name, type }, detail });
const weapon = (name, dice, type, properties = [], extra = {}) => ({ name, weapon: { name, damageDice: dice, damageType: { name: type }, properties, isSimple: false, isMartial: true, ...extra } });
const longsword = weapon("Longsword", "1d8", "Slashing", [prop("Versatile", "1d10"), prop("Sap", null, "Mastery")]);
const dagger = weapon("Dagger", "1d4", "Piercing", [prop("Finesse"), prop("Light"), prop("Thrown", "Range 20/60")], { isSimple: true, isMartial: false });
const longbow = weapon("Longbow", "1d8", "Piercing", [prop("Ammunition", "Range 150/600; Arrow"), prop("Heavy")]);

describe("the attacks of the weapons carried", () => {
  it("hits and hurts with Strength, plus the proficiency bonus when trained in the weapon", () => {
    const [attack] = weaponAttacks(sheet({ str: 16 }), 5, [longsword], ["Simple and Martial weapons"]);

    expect(attack).toMatchObject({ name: "Longsword", bonus: "+6", damage: "1d8+3 slashing" });
    expect(attack.notes).toBe("Melee, 5 ft. · Versatile (1d10) · Mastery: Sap");
  });

  it("uses the better of Strength and Dexterity for a finesse weapon, and Dexterity for ammunition", () => {
    const stats = sheet({ str: 10, dex: 18 });

    expect(weaponAttacks(stats, 1, [dagger], ["Simple weapons"])[0]).toMatchObject({ bonus: "+6", damage: "1d4+4 piercing" });
    expect(weaponAttacks(stats, 1, [longbow], ["Martial weapons"])[0]).toMatchObject({ bonus: "+6", damage: "1d8+4 piercing" });
    expect(weaponAttacks(stats, 1, [longbow], ["Martial weapons"])[0].notes).toContain("Ranged 150/600 ft.");
    expect(weaponAttacks(stats, 1, [dagger], ["Simple weapons"])[0].notes).toContain("Thrown 20/60 ft.");
  });

  it("leaves out the proficiency bonus for a weapon the character isn't trained in, and says so", () => {
    const [attack] = weaponAttacks(sheet({ str: 16 }), 5, [longsword], ["Simple weapons", "daggers"]);

    expect(attack.bonus).toBe("+3");
    expect(attack.notes).toContain("Not proficient");
  });

  it("is trained in a weapon the class or the sheet names, in the singular or plural", () => {
    const plain = (items, training) => weaponAttacks(sheet({ str: 10 }), 1, items, training)[0].bonus;

    expect(plain([longsword], ["Simple weapons, shortswords, longswords"])).toBe("+2");
    expect(plain([weapon("Crossbow, Hand", "1d6", "Piercing", [], { isSimple: false })], ["Hand crossbows"])).toBe("+2");
    expect(weaponAttacks({ ...sheet(), training: { weapons: ["Longsword"] } }, 1, [longsword])[0].bonus).toBe("+2");
  });

  it("holds a class to the weapons it limits martial training to", () => {
    const rogue = ["Simple weapons and Martial weapons that have the Finesse or Light property"];
    const rapier = weapon("Rapier", "1d8", "Piercing", [prop("Finesse")]);

    expect(weaponAttacks(sheet(), 1, [rapier], rogue)[0].bonus).toBe("+2");
    expect(weaponAttacks(sheet(), 1, [longsword], rogue)[0].bonus).toBe("+0");
  });

  it("adds the bonus of a magic weapon to the attack and the damage, and assumes training when none is known", () => {
    const magic = { ...longsword, name: "Longsword (+2)" };

    expect(weaponAttacks(sheet({ str: 14 }), 1, [magic])[0]).toMatchObject({ bonus: "+6", damage: "1d8+4 slashing" });
    expect(weaponAttacks(sheet(), 1, [{ ...longsword, weapon: { ...longsword.weapon, isImprovised: true } }])[0].bonus).toBe("+0");
  });

  it("leaves out what isn't a weapon, and gives a damage of a plain number as one", () => {
    const blowgun = weapon("Blowgun", "1", "Piercing", [prop("Ammunition", "Range 25/100; Needle")]);

    expect(weaponAttacks(sheet({ dex: 14 }), 1, [{ name: "Rope" }, null, blowgun], ["Martial weapons"]).map(({ damage }) => damage)).toEqual(["3 piercing"]);
  });
});

describe("what a class says about weapon training", () => {
  it("is read from the 2014 list and the 2024 table of core traits", () => {
    const old = { features: [{ name: "Proficiencies", desc: "**Armor:** None\r\n**Weapons:** Simple weapons, shortswords\r\n**Tools:** None" }] };
    const core = { features: [{ name: "Core Fighter Traits", desc: "|Skills|x|\n|Weapon Proficiencies|Simple and Martial weapons|\n|Armor Training|All|" }] };

    expect(classWeaponTraining(old)).toBe("Simple weapons, shortswords");
    expect(classWeaponTraining(core)).toBe("Simple and Martial weapons");
    expect(classWeaponTraining({ features: [] })).toBeNull();
    expect(classWeaponTraining(null)).toBeNull();
  });
});
