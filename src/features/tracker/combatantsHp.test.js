import { describe, expect, it } from "vitest";
import { editedFields, formatHp, hpFromShown, shownHp } from "./combatants";

describe("counting hit points", () => {
  const orc = { id: 1, name: "Orc", hp: 12, maxHp: 15 };

  it("shows the hit points left when counting down, and the damage taken when counting up", () => {
    expect(shownHp(orc, "down")).toBe(12);
    expect(shownHp(orc, "up")).toBe(3);
  });

  it("turns a shown number back into hit points", () => {
    expect(hpFromShown(orc, 5, "down")).toBe(5);
    expect(hpFromShown(orc, 5, "up")).toBe(10);
  });

  it("counts a row with no known maximum as it is, whichever way", () => {
    expect(shownHp({ hp: 9 }, "up")).toBe(9);
    expect(hpFromShown({ hp: 9 }, 4, "up")).toBe(4);
  });

  it("writes it as current/maximum, or just the number without a maximum", () => {
    expect(formatHp({ hp: 15, maxHp: 15 }, "down")).toBe("15/15");
    expect(formatHp({ hp: 15, maxHp: 15 }, "up")).toBe("0/15");
    expect(formatHp({ hp: 9 }, "up")).toBe(9);
    expect(formatHp({ hp: "", maxHp: undefined }, "down")).toBe("");
  });
});

describe("editedFields", () => {
  const row = { id: 1, name: "Orc", initiative: 8, ac: 13, hp: 12, maxHp: 15 };

  it("takes what changed, and leaves text that isn't a number", () => {
    expect(editedFields({ ...row, initiative: "14", name: "Big Orc" }, row)).toEqual({ initiative: 14, name: "Big Orc" });
    expect(editedFields({ ...row, ac: "lots" }, row)).toEqual({});
  });

  it("adds and takes away from the number shown for hit points, counting down", () => {
    expect(editedFields({ ...row, hpInput: "-5" }, row, "down")).toEqual({ hp: 7 });
    expect(editedFields({ ...row, hpInput: "+2" }, row, "down")).toEqual({ hp: 14 });
    expect(editedFields({ ...row, hpInput: "9" }, row, "down")).toEqual({ hp: 9 });
  });

  it("does the same on the damage shown, counting up", () => {
    expect(editedFields({ ...row, hpInput: "+4" }, row, "up")).toEqual({ hp: 8 }); // 3 damage + 4 = 7 of 15
    expect(editedFields({ ...row, hpInput: "-1" }, row, "up")).toEqual({ hp: 13 });
    expect(editedFields({ ...row, hpInput: "0" }, row, "up")).toEqual({ hp: 15 });
  });
});

describe("temporary hit points and notes", () => {
  const row = { id: 1, name: "Orc", hp: 12, maxHp: 15, tempHp: 5 };

  it("uses up temporary hit points before the row's own when damage is dealt", () => {
    expect(editedFields({ ...row, hpInput: "-3" }, row, "down")).toEqual({ hp: 12, tempHp: 2 });
    expect(editedFields({ ...row, hpInput: "-8" }, row, "down")).toEqual({ hp: 9, tempHp: 0 });
    expect(editedFields({ ...row, hpInput: "+4" }, row, "up")).toEqual({ hp: 12, tempHp: 1 });
    expect(editedFields({ ...row, damageInput: "+9" }, row, "down")).toEqual({ hp: 8, tempHp: 0 });
  });

  it("leaves them alone when hit points are set, healed, or there are none", () => {
    expect(editedFields({ ...row, hpInput: "9" }, row, "down")).toEqual({ hp: 9 });
    expect(editedFields({ ...row, hpInput: "+3" }, row, "down")).toEqual({ hp: 15 });
    expect(editedFields({ ...row, hpInput: "-4", tempHp: undefined }, { ...row, tempHp: undefined }, "down")).toEqual({ hp: 8 });
  });

  it("takes damage typed in the damage taken column, and healing back", () => {
    const plain = { id: 1, name: "Orc", hp: 12, maxHp: 15 };
    expect(editedFields({ ...plain, damageInput: "+2" }, plain, "down")).toEqual({ hp: 10 });
    expect(editedFields({ ...plain, damageInput: "-3" }, plain, "down")).toEqual({ hp: 15 });
    expect(editedFields({ ...plain, damageInput: "0" }, plain, "down")).toEqual({ hp: 15 });
  });

  it("sets temporary hit points, never below none, and takes notes as typed", () => {
    expect(editedFields({ ...row, tempHp: "8" }, row)).toEqual({ tempHp: 8 });
    expect(editedFields({ ...row, tempHp: "" }, row)).toEqual({ tempHp: 0 });
    expect(editedFields({ ...row, tempHp: "-2" }, row)).toEqual({ tempHp: 0 });
    expect(editedFields({ ...row, note1: "Poisoned" }, row)).toEqual({ note1: "Poisoned" });
    expect(editedFields({ ...row, note1: "" }, { ...row, note1: "Poisoned" })).toEqual({ note1: "" });
    expect(editedFields({ ...row, note1: "" }, row)).toEqual({});
  });
});
