import { describe, expect, it } from "vitest";
import chainMail from "../../test/fixtures/item-chain-mail.json";
import longsword from "../../test/fixtures/item-longsword.json";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import {
  attunementText,
  averageDamage,
  formatArmorClass,
  formatCost,
  formatDamage,
  formatWeight,
  isMagicItem,
  itemKindName,
  weaponClass,
  weaponProperties,
} from "./itemFormat";

describe("kinds of item", () => {
  it("tells magic items from ordinary ones by their rarity field, even when it's empty", () => {
    expect(isMagicItem(rope)).toBe(false);
    expect(isMagicItem(bagOfHolding)).toBe(true);
    expect(isMagicItem({ ...bagOfHolding, rarity: null })).toBe(true);
    expect(itemKindName(rope)).toBe("Item");
    expect(itemKindName(bagOfHolding)).toBe("Magic item");
  });
});

describe("cost and weight", () => {
  it("shows the gold-piece cost in the coin that reads best", () => {
    expect(formatCost(15)).toBe("15 gp");
    expect(formatCost(1500)).toBe("1,500 gp");
    expect(formatCost(0.5)).toBe("5 sp");
    expect(formatCost(0.15)).toBe("1.5 sp");
    expect(formatCost(0.04)).toBe("4 cp");
    expect(formatCost(0.4)).toBe("4 sp");
  });

  it("shows nothing for a cost or weight nobody gave", () => {
    for (const nothing of [0, null, undefined]) {
      expect(formatCost(nothing)).toBe("—");
      expect(formatWeight(nothing)).toBe("—");
    }
  });

  it("shows the weight with its unit", () => {
    expect(formatWeight(55, "lb")).toBe("55 lb");
    expect(formatWeight(2.5)).toBe("2.5 lb");
  });
});

describe("attunement", () => {
  it("is nothing when not required, and plain when no one is named", () => {
    expect(attunementText({ requiresAttunement: false })).toBeNull();
    expect(attunementText({ requiresAttunement: true, attunementDetail: null })).toBe("Requires attunement");
  });

  it("uses the source's wording of who, whatever its case", () => {
    expect(attunementText({ requiresAttunement: true, attunementDetail: "Requires Attunement by a Paladin" })).toBe(
      "Requires attunement by a paladin",
    );
    expect(attunementText({ requiresAttunement: true, attunementDetail: "requires attunement by a spellcaster" })).toBe(
      "Requires attunement by a spellcaster",
    );
  });
});

describe("weapons", () => {
  it("describes the damage and class", () => {
    expect(formatDamage(longsword.weapon)).toBe("1d8 slashing");
    expect(weaponClass(longsword.weapon)).toBe("Martial");
    expect(weaponClass({ isSimple: true })).toBe("Simple");
    expect(weaponClass({ isImprovised: true })).toBe("Improvised");
    expect(weaponClass({})).toBeNull();
  });

  it("averages the damage dice", () => {
    expect(averageDamage("1d8")).toBe(4.5);
    expect(averageDamage("2d6")).toBe(7);
    expect(averageDamage("1")).toBe(1);
    expect(averageDamage("a lot")).toBeNull();
    expect(averageDamage(undefined)).toBeNull();
  });

  it("splits the properties from the masteries, with each one's detail", () => {
    const { properties, masteries } = weaponProperties(longsword.weapon);

    expect(properties.map((property) => property.label)).toEqual(["Versatile (1d10)"]);
    expect(masteries.map((property) => property.label)).toEqual(["Sap"]);
    expect(properties[0].desc).toMatch(/one or two hands/);
  });
});

describe("armor", () => {
  it("shows the armor class as the source gives it", () => {
    expect(formatArmorClass(chainMail.armor, chainMail)).toBe("16");
    expect(formatArmorClass({ acDisplay: "14 + Dex modifier (max 2)", acBase: 14 }, {})).toBe("14 + Dex modifier (max 2)");
    expect(formatArmorClass({ acBase: 11 }, {})).toBe("11");
  });

  it("shows a shield as a bonus", () => {
    expect(formatArmorClass({ acDisplay: "2", acBase: 2 }, { category: { key: "shield" } })).toBe("+2");
  });
});
