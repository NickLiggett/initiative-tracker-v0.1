import { describe, expect, it, vi } from "vitest";
import { openSheet, sheetIdFromSearch, sheetUrl } from "./sheetAddress";

describe("sheetIdFromSearch", () => {
  it("is the character the address asks for", () => {
    expect(sheetIdFromSearch("?sheet=7")).toBe(7);
    expect(sheetIdFromSearch("?x=1&sheet=12")).toBe(12);
  });

  it("is nothing for an address that asks for none, or for nonsense", () => {
    for (const search of ["", "?sheet=", "?sheet=abc", "?sheet=-1", "?sheet=7.5", "?other=7"]) {
      expect(sheetIdFromSearch(search)).toBeNull();
    }
  });
});

describe("sheetUrl and openSheet", () => {
  it("is the app's own address with the character on it", () => {
    expect(sheetUrl(7, { origin: "https://dm.example", pathname: "/" })).toBe("https://dm.example/?sheet=7");
  });

  it("opens it in a new tab", () => {
    const open = vi.fn();

    openSheet(7, open);

    expect(open).toHaveBeenCalledWith(expect.stringContaining("?sheet=7"), "_blank");
  });
});
