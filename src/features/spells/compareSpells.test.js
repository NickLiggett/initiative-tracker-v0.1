import { describe, expect, it } from "vitest";
import { compareSpells, sameDescription } from "./compareSpells";

const fireball = {
  name: "Fireball",
  level: 3,
  school: { name: "Evocation" },
  classes: [{ name: "Sorcerer" }, { name: "Wizard" }],
  castingTime: "action",
  range: 150,
  rangeText: "150 feet",
  verbal: true,
  somatic: true,
  material: true,
  materialSpecified: "A ball of bat guano.",
  duration: "instantaneous",
  concentration: false,
  ritual: false,
  targetType: "point",
  targetCount: 1,
  shapeType: "sphere",
  shapeSize: 20,
  shapeSizeUnit: "feet",
  savingThrowAbility: "dexterity",
  attackRoll: false,
  damageRoll: "8d6",
  damageTypes: ["fire"],
  desc: "A bright streak.",
  higherLevel: "More damage.",
};
const fireBolt = {
  name: "Fire Bolt",
  level: 0,
  school: { name: "Evocation" },
  classes: [{ name: "Wizard" }],
  castingTime: "action",
  range: 120,
  rangeText: "120 feet",
  verbal: true,
  somatic: true,
  material: false,
  duration: "instantaneous",
  concentration: false,
  ritual: false,
  targetType: "creature",
  targetCount: 1,
  savingThrowAbility: "",
  attackRoll: true,
  damageRoll: "1d10",
  damageTypes: ["fire"],
  desc: "You hurl a mote of fire.",
};

const row = (sections, label) => sections.flatMap((section) => section.rows).find((one) => one.label === label);

describe("compareSpells", () => {
  const sections = compareSpells(fireball, fireBolt);

  it("has an overview and an effect section", () => {
    expect(sections.map((section) => section.title)).toEqual(["Overview", "Effect"]);
  });

  it("compares levels as numbers, saying how much higher", () => {
    expect(row(sections, "Level")).toMatchObject({ values: ["3rd level", "Cantrip"], delta: -3, higher: 0, deltaText: "+3 levels", differs: true });
  });

  it("compares range as a number, shown as the spells' own words", () => {
    expect(row(sections, "Range")).toMatchObject({ values: ["150 feet", "120 feet"], higher: 0, deltaText: "+30 ft" });
  });

  it("compares damage by its average, shown as the dice", () => {
    expect(row(sections, "Damage")).toMatchObject({ values: ["8d6 fire", "1d10 fire"], delta: -23, higher: 0, deltaText: "+23 average" });
  });

  it("says where they differ and where they don't, in words", () => {
    expect(row(sections, "School")).toMatchObject({ values: ["Evocation", "Evocation"], differs: false });
    expect(row(sections, "Classes").values).toEqual(["Sorcerer, Wizard", "Wizard"]);
    expect(row(sections, "Components").values).toEqual(["V, S, M (A ball of bat guano)", "V, S"]);
    expect(row(sections, "Saving throw").values).toEqual(["Dexterity saving throw", "—"]);
    expect(row(sections, "Spell attack").values).toEqual(["—", "Yes"]);
    expect(row(sections, "Area").values).toEqual(["20-foot sphere", "—"]);
    expect(row(sections, "Concentration").values).toEqual(["No", "No"]);
  });

  it("leaves out a row that says nothing for either spell", () => {
    const plain = compareSpells({ name: "A", level: 1 }, { name: "B", level: 2 });

    expect(plain.flatMap((section) => section.rows).map((one) => one.label)).toEqual(["Level", "Concentration", "Ritual"]);
  });
});

describe("sameDescription", () => {
  it("is whether both the description and the higher-level text are the same", () => {
    expect(sameDescription({ desc: "x", higherLevel: "y" }, { desc: " x ", higherLevel: "y" })).toBe(true);
    expect(sameDescription({ desc: "x" }, { desc: "x", higherLevel: null })).toBe(true);
    expect(sameDescription({ desc: "x" }, { desc: "z" })).toBe(false);
    expect(sameDescription({ desc: "x", higherLevel: "y" }, { desc: "x" })).toBe(false);
  });
});
