import { describe, expect, it } from "vitest";
import {
  averageDamage,
  castingOptionName,
  castingTimeText,
  castingTimeWithCondition,
  componentsText,
  damageText,
  durationText,
  hasDetails,
  levelName,
  rangeText,
  saveText,
  shapeText,
  spellKind,
  targetText,
} from "./spellFormat";

describe("levelName", () => {
  it("says cantrip for 0 and the ordinal for the rest", () => {
    expect(levelName(0)).toBe("Cantrip");
    expect(levelName(1)).toBe("1st level");
    expect(levelName(3)).toBe("3rd level");
    expect(levelName(9)).toBe("9th level");
    expect(levelName(12)).toBe("Level 12");
  });
});

describe("spellKind", () => {
  it("reads like a spell card", () => {
    expect(spellKind({ level: 3, school: { name: "Evocation" } })).toBe("3rd-level evocation");
    expect(spellKind({ level: 0, school: { name: "Evocation" } })).toBe("Evocation cantrip");
    expect(spellKind({ level: 1, school: { name: "Divination" }, ritual: true })).toBe("1st-level divination (ritual)");
    expect(spellKind({ level: 0, school: { name: "Illusion" }, ritual: true })).toBe("Illusion cantrip (ritual)");
  });

  it("copes with a spell that has no school", () => {
    expect(spellKind({ level: 2 })).toBe("2nd-level");
    expect(spellKind({ level: 0 })).toBe("Cantrip");
  });
});

describe("castingTimeText", () => {
  it("writes out the backend's codes", () => {
    expect(castingTimeText("action")).toBe("1 action");
    expect(castingTimeText("bonus-action")).toBe("1 bonus action");
    expect(castingTimeText("reaction")).toBe("1 reaction");
    expect(castingTimeText("round")).toBe("1 round");
    expect(castingTimeText("1minute")).toBe("1 minute");
    expect(castingTimeText("10minutes")).toBe("10 minutes");
    expect(castingTimeText("1hour")).toBe("1 hour");
    expect(castingTimeText("24hours")).toBe("24 hours");
  });

  it("makes something readable of any other code, and nothing of none", () => {
    expect(castingTimeText("special")).toBe("Special");
    expect(castingTimeText("bonus-thing")).toBe("Bonus thing");
    expect(castingTimeText("")).toBe("");
    expect(castingTimeText(null)).toBe("");
  });
});

describe("castingTimeWithCondition", () => {
  it("says what a reaction is taken in response to", () => {
    const shield = { castingTime: "reaction", reactionCondition: " which you take when you are hit by an attack " };

    expect(castingTimeWithCondition(shield)).toBe("1 reaction, which you take when you are hit by an attack");
  });

  it("is the plain time otherwise", () => {
    expect(castingTimeWithCondition({ castingTime: "reaction" })).toBe("1 reaction");
    expect(castingTimeWithCondition({ castingTime: "action", reactionCondition: "ignored" })).toBe("1 action");
  });
});

describe("rangeText", () => {
  it("uses the spell's own words, or else its distance", () => {
    expect(rangeText({ rangeText: "Self", range: 0 })).toBe("Self");
    expect(rangeText({ rangeText: " Touch " })).toBe("Touch");
    expect(rangeText({ range: 150, rangeUnit: "feet" })).toBe("150 feet");
    expect(rangeText({ range: 60, rangeUnit: "ft" })).toBe("60 feet");
    expect(rangeText({ range: 0 })).toBe("");
  });
});

describe("componentsText", () => {
  it("lists them, with the materials", () => {
    expect(componentsText({ verbal: true, somatic: true, material: true, materialSpecified: "A tiny ball of bat guano and sulfur." })).toBe(
      "V, S, M (A tiny ball of bat guano and sulfur)",
    );
  });

  it("adds what the materials cost, and whether they are used up", () => {
    const spell = { verbal: true, material: true, materialSpecified: "a diamond", materialCost: 300, materialConsumed: true };

    expect(componentsText(spell)).toBe("V, M (a diamond, worth 300 gp, consumed)");
  });

  it("says M alone when no materials are given, and leaves out what isn't there", () => {
    expect(componentsText({ verbal: true, somatic: true, material: true, materialSpecified: "" })).toBe("V, S, M");
    expect(componentsText({ verbal: true, somatic: false, material: false })).toBe("V");
    expect(componentsText({})).toBe("");
  });
});

describe("durationText", () => {
  it("capitalizes it, and adds concentration", () => {
    expect(durationText({ duration: "instantaneous" })).toBe("Instantaneous");
    expect(durationText({ duration: "1 minute" })).toBe("1 minute");
    expect(durationText({ duration: "1 minute", concentration: true })).toBe("Concentration, up to 1 minute");
  });

  it("doesn't need concentration for something that is over at once", () => {
    expect(durationText({ duration: "instantaneous", concentration: true })).toBe("Instantaneous");
  });

  it("copes with no duration", () => {
    expect(durationText({ duration: "", concentration: true })).toBe("Concentration");
    expect(durationText({})).toBe("");
  });
});

describe("saveText and targetText and shapeText", () => {
  it("names the saving throw", () => {
    expect(saveText({ savingThrowAbility: "dexterity" })).toBe("Dexterity saving throw");
    expect(saveText({ savingThrowAbility: "" })).toBe("");
  });

  it("counts targets", () => {
    expect(targetText({ targetType: "creature", targetCount: 1 })).toBe("1 creature");
    expect(targetText({ targetType: "creature", targetCount: 3 })).toBe("3 creatures");
    expect(targetText({ targetType: "area", targetCount: 1 })).toBe("1 area");
    expect(targetText({ targetType: "object" })).toBe("Object");
    expect(targetText({})).toBe("");
  });

  it("describes an area", () => {
    expect(shapeText({ shapeType: "sphere", shapeSize: 20, shapeSizeUnit: "feet" })).toBe("20-foot sphere");
    expect(shapeText({ shapeType: "cone", shapeSize: 15, shapeSizeUnit: "ft" })).toBe("15-foot cone");
    expect(shapeText({ shapeType: "line" })).toBe("Line");
    expect(shapeText({})).toBe("");
  });
});

describe("damageText", () => {
  it("joins the dice and the types", () => {
    expect(damageText({ damageRoll: "8d6", damageTypes: ["fire"] })).toBe("8d6 fire");
    expect(damageText({ damageRoll: "8d6", damageTypes: ["fire", "cold"] })).toBe("8d6 fire and cold");
    expect(damageText({ damageRoll: "2d6", damageTypes: ["fire", "cold", "acid"] })).toBe("2d6 fire, cold and acid");
  });

  it("copes with types without dice, dice without types, and neither", () => {
    expect(damageText({ damageRoll: "", damageTypes: ["fire", "cold"] })).toBe("fire, cold");
    expect(damageText({ damageRoll: "1d4", damageTypes: [] })).toBe("1d4");
    expect(damageText({})).toBe("");
  });
});

describe("averageDamage", () => {
  it("is the average of the dice, rounded down", () => {
    expect(averageDamage("8d6")).toBe(28);
    expect(averageDamage("1d10")).toBe(5);
    expect(averageDamage("1d10+3")).toBe(8);
    expect(averageDamage("2d6 + 1d4")).toBe(9);
    expect(averageDamage("3d8 - 1")).toBe(12);
  });

  it("is null when it isn't dice", () => {
    expect(averageDamage("")).toBeNull();
    expect(averageDamage(null)).toBeNull();
    expect(averageDamage("special")).toBeNull();
  });
});

describe("castingOptionName", () => {
  it("says what the option is for", () => {
    expect(castingOptionName("slot_level_4")).toBe("4th-level slot");
    expect(castingOptionName("player_level_5")).toBe("Character level 5");
    expect(castingOptionName("default")).toBe("Base");
    expect(castingOptionName("custom_thing")).toBe("Custom thing");
  });
});

describe("hasDetails", () => {
  it("is whether an option says more than which one it is", () => {
    expect(hasDetails({ type: "default", desc: null, damageRoll: null })).toBe(false);
    expect(hasDetails({ type: "slot_level_4", damageRoll: "9d6" })).toBe(true);
    expect(hasDetails({ type: "x", targetCount: 2 })).toBe(true);
  });
});
