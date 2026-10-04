import { describe, expect, it } from "vitest";
import { describePlayer, formatBonus, optionNamed, optionsFor, rulesetLabel } from "./players";

const item = (key, name, system) => ({ key, name, document: { gamesystem: { key: system } } });

describe("rulesetLabel", () => {
  it("says the rules in words", () => {
    expect(rulesetLabel("5e-2014")).toBe("2014 rules");
    expect(rulesetLabel("5e-2024")).toBe("2024 rules");
    expect(rulesetLabel("other")).toBe("other");
  });
});

describe("formatBonus", () => {
  it("writes the sign", () => {
    expect(formatBonus(3)).toBe("+3");
    expect(formatBonus(0)).toBe("+0");
    expect(formatBonus(-2)).toBe("-2");
  });
});

describe("describePlayer", () => {
  it("uses what is known", () => {
    expect(describePlayer({ level: 5, className: "Fighter", speciesName: "Dwarf" })).toBe("Level 5 Fighter · Dwarf");
    expect(describePlayer({ level: 1, className: null, speciesName: "Elf" })).toBe("Level 1 · Elf");
    expect(describePlayer({ level: 3, className: "Rogue", speciesName: null })).toBe("Level 3 Rogue");
  });
});

describe("optionsFor", () => {
  const items = [
    item("srd_wizard", "Wizard", "5e-2014"),
    item("srd-2024_wizard", "Wizard", "5e-2024"),
    item("srd_bard", "Bard", "5e-2014"),
    item("a5e_marshal", "Marshal", "a5e"),
    item("open5e_wizard", "Wizard", "5e-2014"),
    { key: "odd", name: "Odd" },
  ];

  it("keeps one rule set, each name once, by name", () => {
    expect(optionsFor(items, "5e-2014")).toEqual([
      { key: "srd_bard", name: "Bard" },
      { key: "srd_wizard", name: "Wizard" },
    ]);
    expect(optionsFor(items, "5e-2024")).toEqual([{ key: "srd-2024_wizard", name: "Wizard" }]);
  });
});

describe("optionNamed", () => {
  const options = [{ key: "srd_bard", name: "Bard" }];

  it("finds a name however it's typed", () => {
    expect(optionNamed(options, " bard ")).toEqual(options[0]);
    expect(optionNamed(options, "Bar")).toBeUndefined();
    expect(optionNamed(options, "")).toBeUndefined();
  });
});
