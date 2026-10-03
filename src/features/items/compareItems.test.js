import { describe, expect, it } from "vitest";
import chainMail from "../../test/fixtures/item-chain-mail.json";
import longsword from "../../test/fixtures/item-longsword.json";
import rope from "../../test/fixtures/item-rope.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import anchor from "../../test/fixtures/magic-item-weapon.json";
import { compareItems, sameDescription } from "./compareItems";

/** The table's rows by "Section/Label". */
const rowsByName = (first, second) =>
  Object.fromEntries(
    compareItems(first, second).flatMap((section) => section.rows.map((row) => [`${section.title}/${row.label}`, row])),
  );

describe("comparing an ordinary item with a magic item", () => {
  const table = rowsByName(rope, bagOfHolding);

  it("shows what each is, with nothing where a kind has no such thing", () => {
    expect(table["Overview/Kind"].values).toEqual(["Item", "Magic item"]);
    expect(table["Overview/Category"].values).toEqual(["Adventuring Gear", "Wondrous Item"]);
    expect(table["Overview/Rarity"]).toMatchObject({ values: ["—", "Uncommon"], delta: null, higher: null });
    expect(table["Overview/Attunement"].values).toEqual(["—", "Not required"]);
  });

  it("doesn't compare a cost or weight nobody gave", () => {
    expect(table["Overview/Cost"]).toMatchObject({ values: ["1 gp", "—"], delta: null });
    expect(table["Overview/Weight"]).toMatchObject({ values: ["5 lb", "—"], delta: null });
  });

  it("leaves out the weapon and armor sections when neither has any", () => {
    expect(compareItems(rope, bagOfHolding).map((section) => section.title)).toEqual(["Overview"]);
  });
});

describe("comparing two weapons", () => {
  const table = rowsByName(longsword, anchor);

  it("compares the damage by its average, showing each one's dice", () => {
    expect(table["Weapon/Damage"]).toMatchObject({ values: ["1d8 slashing", "1d8 piercing"], delta: 0, higher: null, differs: true });
    expect(rowsByName({ weapon: { damageDice: "1d8" } }, { weapon: { damageDice: "2d6" } })["Weapon/Damage"]).toMatchObject({
      delta: 2.5,
      higher: 1,
      deltaText: "+2.5 average",
    });
  });

  it("shows the base weapon, class, properties and mastery", () => {
    expect(table["Weapon/Weapon"].values).toEqual(["Longsword", "War Pick"]);
    expect(table["Weapon/Class"]).toMatchObject({ values: ["Martial", "Martial"], differs: false });
    expect(table["Weapon/Properties"].values).toEqual(["Versatile (1d10)", "—"]);
    expect(table["Weapon/Mastery"].values).toEqual(["Sap", "—"]);
  });

  it("doesn't mention armor", () => {
    expect(Object.keys(table).some((name) => name.startsWith("Armor/"))).toBe(false);
  });
});

describe("comparing armor with something that isn't", () => {
  const table = rowsByName(chainMail, rope);

  it("shows the armor's numbers against nothing", () => {
    expect(table["Armor/Armor Class"]).toMatchObject({ values: ["16", "—"], delta: null });
    expect(table["Armor/Type"].values).toEqual(["Heavy", "—"]);
    expect(table["Armor/Strength required"].values).toEqual(["13", "—"]);
    expect(table["Armor/Stealth"].values).toEqual(["Disadvantage", "—"]);
  });

  it("compares armor class numerically, but shows it as the source does", () => {
    const leather = { armor: { acBase: 11, acDisplay: "11 + Dex modifier", category: "light" }, category: { key: "armor" } };
    const row = rowsByName(leather, chainMail)["Armor/Armor Class"];

    expect(row).toMatchObject({ values: ["11 + Dex modifier", "16"], delta: 5, higher: 1, deltaText: "+5" });
  });
});

describe("cost, weight and rarity differences", () => {
  const gear = (cost, weight) => ({ name: "x", cost, weight, weightUnit: "lb", category: { name: "Gear" } });

  it("show how much more the bigger is, in coins", () => {
    expect(rowsByName(gear(0.4, 1), gear(0.05, 3))["Overview/Cost"]).toMatchObject({
      values: ["4 sp", "5 cp"],
      higher: 0,
      deltaText: "+3.5 sp",
    });
    expect(rowsByName(gear(15, 1), gear(1500, 3))["Overview/Cost"]).toMatchObject({ higher: 1, deltaText: "+1,485 gp" });
    expect(rowsByName(gear(1, 1.25), gear(1, 3))["Overview/Weight"]).toMatchObject({ higher: 1, deltaText: "+1.75 lb" });
  });

  it("show how many ranks apart the rarities are", () => {
    const magic = (rarity) => ({ name: "x", rarity, requiresAttunement: false, category: { name: "Ring" } });
    const row = rowsByName(magic({ name: "Common", rank: 1 }), magic({ name: "Rare", rank: 3 }))["Overview/Rarity"];

    expect(row).toMatchObject({ values: ["Common", "Rare"], higher: 1, deltaText: "+2 ranks" });
  });

  it("names the attunement when it's required", () => {
    const magic = (requiresAttunement, attunementDetail) => ({ name: "x", rarity: null, requiresAttunement, attunementDetail });

    expect(rowsByName(magic(true, null), magic(true, "Requires Attunement by a Paladin"))["Overview/Attunement"].values).toEqual([
      "Requires attunement",
      "Requires attunement by a paladin",
    ]);
  });
});

describe("sameDescription", () => {
  it("is true for equal descriptions, ignoring surrounding space, and never for empty ones", () => {
    expect(sameDescription({ desc: "A rope. " }, { desc: " A rope." })).toBe(true);
    expect(sameDescription({ desc: "A rope." }, { desc: "A cord." })).toBe(false);
    expect(sameDescription({ desc: "" }, { desc: "" })).toBe(false);
    expect(sameDescription({}, {})).toBe(false);
  });
});
