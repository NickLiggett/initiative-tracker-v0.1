// Resting: what comes back on a short rest and on a long rest, across everything the sheet counts.
//
//   short rest: features that come back on one, and pact slots
//   long rest:  all features, all pact slots, all spell slots, and half the hit dice (the biggest first)
//
// Spending a hit die to heal is the player's roll and not counted here.

import { hitDiceRegained, refillPact, refillSlots, regainHitDice } from "./sheetCasting";

export const RESTS = [
  { key: "short", label: "Short rest" },
  { key: "long", label: "Long rest" },
];

const comesBack = (feature, rest) => feature.uses && (rest === "long" || feature.uses.per === "short");

/** The sheet after a rest. */
export function takeRest(sheet, rest) {
  const features = (sheet.features ?? []).map((feature) => (comesBack(feature, rest) ? { ...feature, uses: { ...feature.uses, used: 0 } } : feature));
  let rested = sheet.features ? { ...sheet, features } : sheet;
  rested = refillPact(rested);
  if (rest === "long") {
    rested = regainHitDice(refillSlots(rested));
  }
  return rested;
}

/** Whether a rest would give anything back: something spent that comes back on it. */
export function restWouldHelp(sheet, rest) {
  const features = (sheet.features ?? []).some((feature) => comesBack(feature, rest) && feature.uses.used > 0);
  const pact = (sheet.pact?.used ?? 0) > 0;
  if (rest === "short") {
    return features || pact;
  }
  const slots = Object.values(sheet.slots ?? {}).some((slot) => slot.used > 0);
  const dice = hitDiceRegained(sheet) > 0 && (sheet.hitDice ?? []).some((pool) => pool.used > 0);
  return features || pact || slots || dice;
}

/** Whether the sheet counts anything that a rest gives back, so that there is a point showing the rest buttons. */
export function hasRestables(sheet) {
  return (sheet.features ?? []).some((feature) => feature.uses) || Boolean(sheet.pact) || Object.keys(sheet.slots ?? {}).length > 0 || (sheet.hitDice ?? []).length > 0;
}
