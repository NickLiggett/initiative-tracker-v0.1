import { describe, expect, it } from "vitest";
import { contrastRatio, normalizeHex } from "./colors";

describe("normalizeHex", () => {
  it("makes colors #rrggbb in lower case", () => {
    expect(normalizeHex("#1976D2")).toBe("#1976d2");
    expect(normalizeHex("1976d2")).toBe("#1976d2");
    expect(normalizeHex("  #ABC ")).toBe("#aabbcc");
    expect(normalizeHex("f0f")).toBe("#ff00ff");
  });

  it("is null for anything else", () => {
    for (const bad of ["", "#12", "#12345", "#1234567", "blue", "#gggggg", "rgb(1,2,3)", null, undefined, 5, {}]) {
      expect(normalizeHex(bad)).toBeNull();
    }
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white, and 1 for a color against itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1976d2", "#1976d2")).toBeCloseTo(1, 5);
  });

  it("rates the default blue as fine on white and a pale yellow as not", () => {
    expect(contrastRatio("#1976d2", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#ffff99", "#ffffff")).toBeLessThan(3);
  });
});
