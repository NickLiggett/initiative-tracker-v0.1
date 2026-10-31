import { describe, expect, it } from "vitest";
import { walkProblem, withListEntry, withOtherSpeed, withPersonal, withSenses, withWalkingSpeed } from "./sheetEdits";

describe("speed", () => {
  it("sets and clears the walking speed and the other speed, each leaving the other", () => {
    let sheet = withWalkingSpeed({ abilities: { str: 10 } }, "30");
    sheet = withOtherSpeed(sheet, " fly 30 ft. ");
    expect(sheet).toEqual({ abilities: { str: 10 }, speed: { walk: 30, other: "fly 30 ft." } });
    sheet = withWalkingSpeed(sheet, "");
    expect(sheet.speed).toEqual({ other: "fly 30 ft." });
    expect(withOtherSpeed(sheet, "  ")).toEqual({ abilities: { str: 10 } });
  });

  it("allows whole feet to 999, or nothing", () => {
    expect(["", "0", "30", "999"].map(walkProblem)).toEqual([null, null, null, null]);
    expect(["1000", "-5", "3.5", "fast"].every((text) => walkProblem(text) !== null)).toBe(true);
  });
});

describe("senses and lists", () => {
  it("keep one entry a line, without blanks, and are left out when empty", () => {
    expect(withSenses({}, "Darkvision 120 ft.\n\n Blindsight 10 ft. ")).toEqual({ senses: ["Darkvision 120 ft.", "Blindsight 10 ft."] });
    expect(withSenses({ senses: ["x"], speed: { walk: 30 } }, "")).toEqual({ speed: { walk: 30 } });
  });

  it("set one list of a group and leave the others", () => {
    let sheet = withListEntry({}, "defenses", "resistances", "necrotic\nfire");
    sheet = withListEntry(sheet, "defenses", "immunities", "poison");
    expect(sheet).toEqual({ defenses: { resistances: ["necrotic", "fire"], immunities: ["poison"] } });
    sheet = withListEntry(sheet, "defenses", "immunities", "");
    expect(sheet).toEqual({ defenses: { resistances: ["necrotic", "fire"] } });
    expect(withListEntry(sheet, "defenses", "resistances", "")).toEqual({});
    expect(withListEntry({ training: { languages: ["Common"] } }, "training", "armor", "Heavy")).toEqual({ training: { languages: ["Common"], armor: ["Heavy"] } });
  });
});

describe("personal details", () => {
  it("are trimmed, and taken away when emptied", () => {
    let sheet = withPersonal({ saves: ["str"] }, "alignment", " Chaotic Good ");
    expect(sheet).toEqual({ saves: ["str"], personal: { alignment: "Chaotic Good" } });
    sheet = withPersonal(sheet, "backstory", "Long ago.\nFar away.");
    expect(sheet.personal.backstory).toBe("Long ago.\nFar away.");
    sheet = withPersonal(withPersonal(sheet, "alignment", ""), "backstory", "");
    expect(sheet).toEqual({ saves: ["str"] });
  });
});
