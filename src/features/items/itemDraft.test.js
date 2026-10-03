import { describe, expect, it } from "vitest";
import chainMail from "../../test/fixtures/item-chain-mail.json";
import longsword from "../../test/fixtures/item-longsword.json";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import anchor from "../../test/fixtures/magic-item-weapon.json";
import {
  armorClassText,
  blankArmor,
  blankItemDraft,
  blankWeapon,
  costParts,
  draftFromItem,
  itemFromDraft,
  itemProblems,
  newProperty,
} from "./itemDraft";

describe("a new item", () => {
  it("needs a name, and a magic item a rarity", () => {
    expect(itemProblems(blankItemDraft())).toEqual(["Give the item a name."]);
    expect(itemProblems({ ...blankItemDraft(), name: "Rope" })).toEqual([]);
    expect(itemProblems({ ...blankItemDraft("magic"), name: "Ring" })).toEqual(["Choose a rarity for the magic item."]);
    expect(itemProblems({ ...blankItemDraft("magic"), name: "Ring", rarity: { key: "rare", name: "Rare", rank: 3 } })).toEqual([]);
  });

  it("needs an armor class when it's armor", () => {
    const draft = { ...blankItemDraft(), name: "Mail", armor: { ...blankArmor(), acBase: "" } };
    expect(itemProblems(draft)).toEqual(["Give the armor an armor class."]);
  });

  it("is saved with its cost in gold and its weight", () => {
    const draft = { ...blankItemDraft(), name: " Gribble's Rope ", desc: "A rope.", costAmount: "4", costCoin: "sp", weight: "2.5" };

    expect(itemFromDraft(draft)).toEqual({
      name: "Gribble's Rope",
      desc: "A rope.",
      category: null,
      cost: 0.4,
      weight: 2.5,
      weightUnit: "lb",
      weapon: null,
      armor: null,
    });
  });

  it("has no cost or weight when none are given", () => {
    expect(itemFromDraft({ ...blankItemDraft(), name: "X" })).toMatchObject({ cost: 0, weight: 0 });
  });

  it("keeps a cost the source left out as left out, but a cost that was cleared as 0", () => {
    expect(itemFromDraft(draftFromItem({ ...rope, cost: null })).cost).toBeNull();

    const cleared = draftFromItem(rope);
    cleared.costAmount = "";
    expect(itemFromDraft(cleared).cost).toBe(0);
  });

  it("has no rarity or attunement when it's an ordinary item, which the backend would refuse", () => {
    const item = itemFromDraft({ ...blankItemDraft(), name: "X", rarity: { key: "rare" }, requiresAttunement: true });

    expect(item).not.toHaveProperty("rarity");
    expect(item).not.toHaveProperty("requiresAttunement");
    expect(item).not.toHaveProperty("attunementDetail");
  });

  it("is saved with a rarity and attunement when it's a magic item", () => {
    const rare = { key: "rare", name: "Rare", rank: 3 };
    const draft = { ...blankItemDraft("magic"), name: "Ring", rarity: rare, requiresAttunement: true, attunementDetail: " requires attunement by a wizard " };

    expect(itemFromDraft(draft)).toMatchObject({ rarity: rare, requiresAttunement: true, attunementDetail: "requires attunement by a wizard" });
    expect(itemFromDraft({ ...draft, requiresAttunement: false })).toMatchObject({ requiresAttunement: false, attunementDetail: null });
  });
});

describe("costs", () => {
  it("are written in the coin that reads best", () => {
    expect(costParts(15)).toEqual({ amount: "15", coin: "gp" });
    expect(costParts(0.4)).toEqual({ amount: "4", coin: "sp" });
    expect(costParts(0.15)).toEqual({ amount: "1.5", coin: "sp" });
    expect(costParts(0.04)).toEqual({ amount: "4", coin: "cp" });
    expect(costParts(0)).toEqual({ amount: "", coin: "gp" });
    expect(costParts(null)).toEqual({ amount: "", coin: "gp" });
  });

  it.each([15, 1500, 0.5, 0.4, 0.15, 0.05, 0.04, 0.01, 2.5])("come back as %s gold after a round trip", (gold) => {
    const draft = draftFromItem({ ...rope, cost: gold });

    expect(itemFromDraft(draft).cost).toBe(gold);
  });
});

describe("armor", () => {
  it("writes its armor class the way the source does", () => {
    expect(armorClassText({ acBase: "16", addDex: false })).toBe("16");
    expect(armorClassText({ acBase: "11", addDex: true, capDex: "" })).toBe("11 + Dex modifier");
    expect(armorClassText({ acBase: "14", addDex: true, capDex: "2" })).toBe("14 + Dex modifier (max 2)");
    expect(armorClassText({ acBase: "", addDex: true })).toBeNull();
  });

  it("is saved with its numbers, and no Dexterity cap without the Dexterity modifier", () => {
    const armor = { category: "medium", acBase: "14", addDex: true, capDex: "2", stealth: true, strength: "13" };
    const draft = { ...blankItemDraft(), name: "Scale Mail", armor };

    expect(itemFromDraft(draft).armor).toEqual({
      key: null,
      name: "Scale Mail",
      category: "medium",
      acDisplay: "14 + Dex modifier (max 2)",
      acBase: 14,
      acAddDexmod: true,
      acCapDexmod: 2,
      grantsStealthDisadvantage: true,
      strengthScoreRequired: 13,
    });
    expect(itemFromDraft({ ...draft, armor: { ...armor, addDex: false } }).armor).toMatchObject({
      acDisplay: "14",
      acAddDexmod: false,
      acCapDexmod: null,
    });
  });
});

describe("weapons", () => {
  it("are saved with their damage, class and properties with their details", () => {
    const versatile = newProperty({ name: "Versatile", desc: "Two hands.", type: null }, " 1d10 ");
    const sap = newProperty({ name: "Sap", desc: "Disadvantage.", type: "Mastery" });
    const weapon = { ...blankWeapon(), dice: "1d8", damageType: { key: "slashing", name: "Slashing" }, weaponClass: "martial", properties: [versatile, sap] };

    expect(itemFromDraft({ ...blankItemDraft(), name: "Gribble Blade", weapon }).weapon).toEqual({
      key: null,
      name: "Gribble Blade",
      damageDice: "1d8",
      damageType: { key: "slashing", name: "Slashing" },
      distanceUnit: "feet",
      isSimple: false,
      isMartial: true,
      isImprovised: false,
      properties: [
        { detail: "1d10", property: { name: "Versatile", desc: "Two hands.", type: null } },
        { detail: null, property: { name: "Sap", desc: "Disadvantage.", type: "Mastery" } },
      ],
    });
  });
});

describe("a draft from an existing item", () => {
  it.each([
    ["rope", rope],
    ["longsword", longsword],
    ["chain mail", chainMail],
    ["Bag of Holding", bagOfHolding],
    ["Anchor of Striking", anchor],
  ])("saves the %s back as it was", (name, item) => {
    const saved = itemFromDraft(draftFromItem(item));

    for (const field of ["name", "desc", "category", "weight", "weightUnit", "weapon", "armor", "rarity", "requiresAttunement", "attunementDetail", "cost", "size", "crossreferences"]) {
      expect(saved[field], field).toEqual(item[field] === undefined ? undefined : item[field]);
    }
  });

  it("knows its kind and keeps it", () => {
    expect(draftFromItem(rope).kind).toBe("item");
    expect(draftFromItem(bagOfHolding).kind).toBe("magic");
    expect(itemFromDraft(draftFromItem(rope))).not.toHaveProperty("rarity");
    expect(itemFromDraft(draftFromItem(bagOfHolding))).toHaveProperty("rarity");
  });

  it("keeps the base weapon's name when the item is renamed", () => {
    const draft = draftFromItem(anchor);
    draft.name = "Anchor of Greater Striking";

    expect(itemFromDraft(draft).weapon).toMatchObject({ name: "War Pick", key: "srd_war-pick" });
  });
});
