import { describe, expect, it } from "vitest";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import {
  abilityModifier,
  actionsOfType,
  bonusList,
  formatChallengeRating,
  formatModifier,
  formatSpeed,
  formatUsageLimits,
  immunityText,
  legendaryActionsPerRound,
  legendaryResistancesPerDay,
} from "./creatureFormat";

describe("creature formatting", () => {
  it("formats challenge ratings", () => {
    expect(formatChallengeRating(0.125)).toBe("1/8");
    expect(formatChallengeRating(0.5)).toBe("1/2");
    expect(formatChallengeRating(17)).toBe("17");
    expect(formatChallengeRating(null)).toBe("—");
  });

  it("formats modifiers and derives them from scores", () => {
    expect(formatModifier(5)).toBe("+5");
    expect(formatModifier(0)).toBe("+0");
    expect(formatModifier(-1)).toBe("-1");
    expect(abilityModifier(27)).toBe(8);
    expect(abilityModifier(9)).toBe(-1);
  });

  it("formats speed", () => {
    expect(formatSpeed({ unit: "feet", walk: 40, fly: 80, climb: 40 })).toBe("Walk 40 ft., Fly 80 ft., Climb 40 ft.");
    expect(formatSpeed({ walk: 0, fly: 30, hover: true })).toBe("Fly 30 ft. (hover)");
  });

  it("formats usage limits", () => {
    expect(formatUsageLimits({ type: "RECHARGE_ON_ROLL", param: 5 })).toBe("Recharge 5–6");
    expect(formatUsageLimits({ type: "RECHARGE_ON_ROLL", param: 6 })).toBe("Recharge 6");
    expect(formatUsageLimits({ type: "PER_DAY", param: 3 })).toBe("3/Day");
    expect(formatUsageLimits(null)).toBeNull();
  });

  it("lists bonuses with readable names", () => {
    expect(bonusList({ perception: 13, sleightOfHand: 4 })).toEqual([["Perception", "+13"], ["Sleight of Hand", "+4"]]);
  });

  it("prefers the source text for immunities", () => {
    expect(immunityText("fire", [{ name: "Fire" }])).toBe("Fire");
    expect(immunityText("", [{ name: "Poisoned" }, { name: "Charmed" }])).toBe("Poisoned, Charmed");
  });
});

describe("the Adult Red Dragon from the backend", () => {
  it("has its actions in stat-block order", () => {
    expect(actionsOfType(dragon, "ACTION")[0].name).toBe("Multiattack");
    expect(actionsOfType(dragon, "LEGENDARY_ACTION").map((a) => a.name)).toEqual(["Detect", "Tail Attack", "Wing Attack"]);
  });

  it("takes the usual 3 legendary actions and has 3 legendary resistances", () => {
    expect(legendaryActionsPerRound(dragon)).toBe(3);
    expect(legendaryResistancesPerDay(dragon)).toBe(3);
  });

  it("reads a stated number of legendary actions", () => {
    const creature = {
      actions: [
        { actionType: "LEGENDARY_ACTION", name: "The dragon can take 2 legendary actions", desc: "" },
        { actionType: "LEGENDARY_ACTION", name: "Roar", desc: "" },
      ],
      traits: [{ name: "Legendary Resistance (4/Day, or 5/Day in Lair)" }],
    };
    expect(legendaryActionsPerRound(creature)).toBe(2);
    expect(legendaryResistancesPerDay(creature)).toBe(4);
  });

  it("has no legendary options when it has no legendary actions", () => {
    expect(legendaryActionsPerRound({ actions: [{ actionType: "ACTION", name: "Bite" }] })).toBe(0);
    expect(legendaryActionsPerRound(null)).toBe(0);
    expect(legendaryResistancesPerDay({ traits: [] })).toBe(0);
  });
});
