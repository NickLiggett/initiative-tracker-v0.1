import { describe, expect, it } from "vitest";
import { numberRow, textRow, withoutEmptyRows } from "./compareRows";

const pair = [{ n: 4, t: "a" }, { n: 9, t: "b" }];

describe("numberRow", () => {
  it("shows both numbers, which is bigger and by how much", () => {
    expect(numberRow("N", pair, (x) => x.n)).toEqual({
      label: "N",
      values: ["4", "9"],
      delta: 5,
      higher: 1,
      deltaText: "+5",
      differs: true,
    });
  });

  it("formats the numbers and the difference as asked", () => {
    const row = numberRow("N", pair, (x) => x.n, (n) => `${n} gp`, (gap) => `${gap} more`);

    expect(row).toMatchObject({ values: ["4 gp", "9 gp"], deltaText: "5 more" });
  });

  it("has no bigger one when they are equal", () => {
    expect(numberRow("N", [{ n: 3 }, { n: 3 }], (x) => x.n)).toMatchObject({ delta: 0, higher: null, deltaText: null, differs: false });
  });

  it("shows a dash, and no difference, for a missing number", () => {
    expect(numberRow("N", [{ n: 3 }, {}], (x) => x.n)).toMatchObject({ values: ["3", "—"], delta: null, higher: null, deltaText: null, differs: true });
  });

  it("rounds away the error in decimal differences", () => {
    expect(numberRow("N", [{ n: 0.05 }, { n: 0.4 }], (x) => x.n).delta).toBe(0.35);
  });
});

describe("textRow", () => {
  it("shows the text, a dash for none, and whether they differ", () => {
    expect(textRow("T", pair, (x) => x.t)).toMatchObject({ values: ["a", "b"], differs: true, delta: null, higher: null });
    expect(textRow("T", [{ t: "a" }, {}], (x) => x.t).values).toEqual(["a", "—"]);
    expect(textRow("T", [{ t: "a" }, { t: "a" }], (x) => x.t).differs).toBe(false);
  });
});

describe("withoutEmptyRows", () => {
  it("drops rows with nothing for either, and sections left with no rows", () => {
    const sections = [
      { title: "Kept", rows: [textRow("has", pair, (x) => x.t), textRow("none", pair, () => null)] },
      { title: "Empty", rows: [textRow("none", pair, () => null)] },
    ];

    expect(withoutEmptyRows(sections).map((section) => [section.title, section.rows.map((row) => row.label)])).toEqual([
      ["Kept", ["has"]],
    ]);
  });
});
