import { describe, expect, it } from "vitest";
import { CONDITIONS, hpBar, hpState, vitalsChanges, vitalsOf } from "./vitals";

describe("vitalsOf", () => {
  it("is the character's own vitals", () => {
    const vitals = { currentHp: 10, tempHp: 3, heroicInspiration: true, conditions: ["Prone"], exhaustion: 1, deathSaveSuccesses: 0, deathSaveFailures: 2 };

    expect(vitalsOf({ hitPoints: 40, vitals })).toEqual(vitals);
  });

  it("is a character unhurt and fine when it has none, at its maximum", () => {
    expect(vitalsOf({ hitPoints: 40 })).toEqual({
      currentHp: 40,
      tempHp: 0,
      heroicInspiration: false,
      conditions: [],
      exhaustion: 0,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    });
  });
});

describe("hpBar", () => {
  it("fills the bar with what is left", () => {
    expect(hpBar({ hitPoints: 40 }, { currentHp: 10, tempHp: 0 })).toEqual({ current: 25, temp: 0 });
  });

  it("makes the bar as wide as the maximum plus the temporary hit points, and shows them beside what is left", () => {
    expect(hpBar({ hitPoints: 30 }, { currentHp: 30, tempHp: 10 })).toEqual({ current: 75, temp: 25 });
  });

  it("is empty for a character that is down, and has none for one without a maximum", () => {
    expect(hpBar({ hitPoints: 30 }, { currentHp: 0, tempHp: 0 })).toEqual({ current: 0, temp: 0 });
    expect(hpBar({ hitPoints: null }, { currentHp: null, tempHp: 0 })).toBeNull();
    expect(hpBar({ hitPoints: 0 }, { currentHp: 0, tempHp: 0 })).toBeNull();
  });
});

describe("hpState", () => {
  it("is healthy above half, hurt above a quarter and bloodied below", () => {
    expect([hpState(40, 40), hpState(40, 21), hpState(40, 20), hpState(40, 11), hpState(40, 10), hpState(40, 0)]).toEqual([
      "healthy",
      "healthy",
      "hurt",
      "hurt",
      "bloodied",
      "bloodied",
    ]);
  });
});

describe("vitalsChanges", () => {
  const before = vitalsOf({ hitPoints: 40 });

  it("is nothing when nothing changed, and only the fields that did when something has", () => {
    expect(vitalsChanges(before, before)).toEqual({});
    expect(vitalsChanges(before, { ...before, currentHp: 25, conditions: ["Prone"] })).toEqual({ currentHp: 25, conditions: ["Prone"] });
  });

  it("does not count conditions in another order as a change", () => {
    const two = { ...before, conditions: ["Prone", "Poisoned"] };

    expect(vitalsChanges(two, { ...two, conditions: ["Poisoned", "Prone"] })).toEqual({});
  });
});

describe("CONDITIONS", () => {
  it("are the fourteen official ones, which the backend takes", () => {
    expect(CONDITIONS).toHaveLength(14);
    expect(CONDITIONS).not.toContain("Exhaustion");
  });
});
