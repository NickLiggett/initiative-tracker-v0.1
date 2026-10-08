import { describe, expect, it } from "vitest";
import { blankSpellDraft, draftFromSpell, spellFromDraft, spellProblems } from "./spellDraft";

const fireball = {
  key: "u1-homebrew_fireball",
  name: "Fireball",
  document: { key: "u1-homebrew" },
  derivedFrom: "srd_fireball",
  castingOptions: [{ type: "slot_level_4", damageRoll: "9d6" }],
  school: { key: "evocation", name: "Evocation" },
  classes: [{ key: "srd_wizard", name: "Wizard" }],
  rangeUnit: "feet",
  shapeSizeUnit: "feet",
  desc: "A bright streak flashes.",
  level: 3,
  higherLevel: "More damage.",
  targetType: "point",
  rangeText: "150 feet",
  range: 150,
  ritual: false,
  castingTime: "action",
  reactionCondition: null,
  verbal: true,
  somatic: true,
  material: true,
  materialSpecified: "A tiny ball of bat guano and sulfur.",
  materialCost: null,
  materialConsumed: false,
  targetCount: 1,
  savingThrowAbility: "dexterity",
  attackRoll: false,
  damageRoll: "8d6",
  damageTypes: ["fire"],
  duration: "instantaneous",
  shapeType: "sphere",
  shapeSize: 20,
  concentration: false,
};

const complete = { ...blankSpellDraft(), name: "Spark", school: { key: "evocation", name: "Evocation" }, desc: "A spark leaps." };

describe("a new spell", () => {
  it("starts as a 1st-level action spell that takes effect at once", () => {
    expect(blankSpellDraft()).toMatchObject({ level: "1", castingTime: "action", duration: "instantaneous", verbal: true, somatic: true, material: false });
  });
});

describe("draftFromSpell", () => {
  it("turns numbers into the text typed, and keeps the spell it came from", () => {
    const draft = draftFromSpell(fireball);

    expect(draft.base).toBe(fireball);
    expect(draft).toMatchObject({ name: "Fireball", level: "3", rangeDistance: "150", targetCount: "1", shapeSize: "20", damageRoll: "8d6" });
    expect(draft.school.key).toBe("evocation");
    expect(draft.classes).toEqual([{ key: "srd_wizard", name: "Wizard" }]);
  });

  it("leaves a distance of 0 (Self, Touch) and nothing as empty text", () => {
    const draft = draftFromSpell({ ...fireball, range: 0, rangeText: "Self", targetCount: null, shapeSize: null, higherLevel: null });

    expect(draft).toMatchObject({ rangeText: "Self", rangeDistance: "", targetCount: "", shapeSize: "", higherLevel: "" });
  });
});

describe("spellFromDraft", () => {
  it("gives back the spell it came from when nothing was changed", () => {
    expect(spellFromDraft(draftFromSpell(fireball))).toEqual({ ...fireball, materialSpecified: "A tiny ball of bat guano and sulfur." });
  });

  it("keeps what the form doesn't show, such as how the spell scales", () => {
    expect(spellFromDraft(draftFromSpell(fireball)).castingOptions).toEqual(fireball.castingOptions);
    expect(spellFromDraft(complete).castingOptions).toEqual([]);
  });

  it("is what the backend takes for a new spell, trimmed", () => {
    const body = spellFromDraft({ ...complete, name: "  Spark ", desc: " A spark leaps. ", level: "0", rangeText: "60 feet", rangeDistance: "60" });

    expect(body).toMatchObject({
      name: "Spark",
      desc: "A spark leaps.",
      level: 0,
      higherLevel: null,
      rangeText: "60 feet",
      range: 60,
      rangeUnit: "feet",
      castingTime: "action",
      reactionCondition: null,
      materialSpecified: null,
      materialCost: null,
      materialConsumed: false,
      duration: "instantaneous",
      savingThrowAbility: "",
      damageRoll: "",
      damageTypes: [],
      shapeType: null,
      shapeSize: null,
    });
    expect(body).not.toHaveProperty("key");
  });

  it("makes the range's words from its distance when none are given", () => {
    expect(spellFromDraft({ ...complete, rangeText: "", rangeDistance: "120" })).toMatchObject({ rangeText: "120 feet", range: 120 });
    expect(spellFromDraft({ ...complete, rangeText: "Self", rangeDistance: "" })).toMatchObject({ rangeText: "Self", range: 0 });
  });

  it("keeps a spell's own unit of distance", () => {
    const miles = draftFromSpell({ ...fireball, range: 1, rangeUnit: "miles", rangeText: "" });

    expect(spellFromDraft(miles)).toMatchObject({ rangeText: "1 miles", range: 1, rangeUnit: "miles" });
  });

  it("keeps a reaction's condition only for a reaction", () => {
    expect(spellFromDraft({ ...complete, castingTime: "reaction", reactionCondition: " when hit " }).reactionCondition).toBe("when hit");
    expect(spellFromDraft({ ...complete, castingTime: "action", reactionCondition: "when hit" }).reactionCondition).toBeNull();
  });

  it("keeps the materials only while there are materials", () => {
    const material = { ...complete, material: true, materialSpecified: " a pearl ", materialCost: "100", materialConsumed: true };

    expect(spellFromDraft(material)).toMatchObject({ material: true, materialSpecified: "a pearl", materialCost: 100, materialConsumed: true });
    expect(spellFromDraft({ ...material, material: false })).toMatchObject({ materialSpecified: null, materialCost: null, materialConsumed: false });
  });

  it("keeps an area's size only while it has a shape", () => {
    expect(spellFromDraft({ ...complete, shapeType: "cone", shapeSize: "15" })).toMatchObject({ shapeType: "cone", shapeSize: 15 });
    expect(spellFromDraft({ ...complete, shapeType: "", shapeSize: "15" })).toMatchObject({ shapeType: null, shapeSize: null });
  });

  it("gives a number of targets, or none", () => {
    expect(spellFromDraft({ ...complete, targetCount: "3" }).targetCount).toBe(3);
    expect(spellFromDraft({ ...complete, targetCount: "" }).targetCount).toBeNull();
    expect(spellFromDraft({ ...complete, targetType: "" }).targetType).toBeNull();
  });
});

describe("spellProblems", () => {
  it("is none for a spell with a name, school and description", () => {
    expect(spellProblems(complete)).toEqual([]);
  });

  it("wants the essentials, and says which is missing", () => {
    expect(spellProblems({ ...complete, name: " " })).toEqual(["Give the spell a name."]);
    expect(spellProblems({ ...complete, school: null })).toEqual(["Choose a school of magic."]);
    expect(spellProblems({ ...complete, castingTime: "" })).toEqual(["Choose a casting time."]);
    expect(spellProblems({ ...complete, duration: " " })).toEqual(["Say how long it lasts."]);
    expect(spellProblems({ ...complete, desc: "" })).toEqual(["Describe what the spell does."]);
  });

  it("keeps the level from 0 to 9", () => {
    expect(spellProblems({ ...complete, level: "0" })).toEqual([]);
    expect(spellProblems({ ...complete, level: "9" })).toEqual([]);
    expect(spellProblems({ ...complete, level: "10" })).toEqual(["Level must be 0 (a cantrip) to 9."]);
    expect(spellProblems({ ...complete, level: "" })).toEqual(["Level must be 0 (a cantrip) to 9."]);
    expect(spellProblems({ ...complete, level: "1.5" })).toEqual(["Level must be 0 (a cantrip) to 9."]);
  });

  it("wants numbers where numbers go, and lets them be empty", () => {
    expect(spellProblems({ ...complete, rangeDistance: "x" })).toEqual(["Range distance must be a whole number."]);
    expect(spellProblems({ ...complete, targetCount: "-1" })).toEqual(["Number of targets must be a whole number."]);
    expect(spellProblems({ ...complete, material: true, materialCost: "ten" })).toEqual(["Material cost must be a number of gold pieces."]);
    expect(spellProblems({ ...complete, material: true, materialCost: "12.5" })).toEqual([]);
    expect(spellProblems({ ...complete, shapeType: "cone", shapeSize: "" })).toEqual([]);
    expect(spellProblems({ ...complete, shapeType: "cone", shapeSize: "0" })).toEqual(["Area size must be a whole number of 1 or more."]);
  });

  it("ignores a material cost when there are no materials", () => {
    expect(spellProblems({ ...complete, material: false, materialCost: "ten" })).toEqual([]);
  });
});
