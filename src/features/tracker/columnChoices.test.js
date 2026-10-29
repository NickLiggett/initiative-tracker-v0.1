import { describe, expect, it } from "vitest";
import { buildColumns, isCellEditable } from "./trackerColumns";
import { DEFAULT_TRACKER_COLUMNS, TRACKER_COLUMNS, columnLabel, sanitizeColumns, sanitizeNoteNames } from "./columnChoices";

describe("choosing columns", () => {
  it("falls back to the defaults when nothing sensible was chosen", () => {
    expect(sanitizeColumns(undefined)).toEqual(DEFAULT_TRACKER_COLUMNS);
    expect(sanitizeColumns("name")).toEqual(DEFAULT_TRACKER_COLUMNS);
  });

  it("keeps only known columns, once each, in display order, and always initiative and name", () => {
    expect(sanitizeColumns(["note1", "hp", "hp", "bogus", "tempHp"])).toEqual(["initiative", "name", "hp", "tempHp", "note1"]);
    expect(sanitizeColumns([])).toEqual(["initiative", "name"]);
  });

  it("names the Notes columns: trimmed, short, three of them, blank for the usual name", () => {
    expect(sanitizeNoteNames([" Conditions ", 5, "x".repeat(50)])).toEqual(["Conditions", "", "x".repeat(30)]);
    expect(sanitizeNoteNames(null)).toEqual(["", "", ""]);
    const note = TRACKER_COLUMNS.find((column) => column.id === "note2");
    expect(columnLabel(note, ["", "Spell slots", ""])).toBe("Spell slots");
    expect(columnLabel(note, ["", "", ""])).toBe("Notes 2");
  });
});

describe("the grid's columns", () => {
  const fields = (options) => buildColumns({ combatants: [], ...options }).map((column) => column.field);

  it("shows the default columns, and the buttons column last", () => {
    expect(fields({})).toEqual([...DEFAULT_TRACKER_COLUMNS, "delete"]);
  });

  it("shows just what was chosen, with the Notes columns named as asked", () => {
    const columns = buildColumns({
      combatants: [],
      visible: ["initiative", "name", "tempHp", "note2", "edit"],
      noteNames: ["", "Conditions", ""],
    });

    expect(columns.map((column) => column.field)).toEqual(["initiative", "name", "tempHp", "note2", "edit", "delete"]);
    expect(columns.find((column) => column.field === "note2").headerName).toBe("Conditions");
  });

  it("shows damage taken from the most hit points, and won't edit it without them", () => {
    const column = buildColumns({ combatants: [], visible: ["damageTaken"] }).find((c) => c.field === "damageTaken");

    expect(column.valueGetter({ row: { hp: 12, maxHp: 15 } })).toBe(3);
    expect(column.valueGetter({ row: { hp: 12 } })).toBe("");
    expect(isCellEditable({ field: "damageTaken", row: { hp: 12 } })).toBe(false);
    expect(isCellEditable({ field: "damageTaken", row: { hp: 12, maxHp: 15 } })).toBe(true);
    expect(isCellEditable({ field: "hp", row: { hp: 12 } })).toBe(true);
  });
});
