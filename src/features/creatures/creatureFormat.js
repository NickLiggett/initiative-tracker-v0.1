// Reading and formatting open5e-backend creature data (the /api/creatures JSON) for display.

import { capitalizeFirstLetter, labelFromCamelCase } from "../../utils/text";

export const ACTION_TYPES = [
  { type: "ACTION", heading: "Actions" },
  { type: "BONUS_ACTION", heading: "Bonus Actions" },
  { type: "REACTION", heading: "Reactions" },
  { type: "LEGENDARY_ACTION", heading: "Legendary Actions" },
];

/** In the order the tracker has always shown them. */
export const ABILITIES = ["charisma", "constitution", "dexterity", "intelligence", "strength", "wisdom"];

const FRACTIONAL_CR = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };

/** 0.25 → "1/4", 17 → "17" */
export function formatChallengeRating(challengeRating) {
  if (challengeRating === null || challengeRating === undefined) {
    return "—";
  }
  return FRACTIONAL_CR[challengeRating] ?? String(challengeRating);
}

/** 5 → "+5", -1 → "-1", 0 → "+0" */
export function formatModifier(modifier) {
  return modifier < 0 ? `${modifier}` : `+${modifier}`;
}

/** The modifier for an ability score: 18 → 4. */
export function abilityModifier(score) {
  return Math.floor((parseInt(score, 10) - 10) / 2);
}

/** {walk: 40, fly: 80, unit: "feet", hover: true} → "Walk 40 ft., Fly 80 ft. (hover)" */
export function formatSpeed(speed) {
  if (!speed) {
    return "—";
  }
  const unit = speed.unit === "feet" || !speed.unit ? "ft." : speed.unit;
  const modes = ["walk", "fly", "swim", "climb", "burrow", "crawl"]
    .filter((mode) => speed[mode])
    .map((mode) => `${capitalizeFirstLetter(mode)} ${speed[mode]} ${unit}`);
  return (modes.join(", ") || "—") + (speed.hover ? " (hover)" : "");
}

/** {type: "RECHARGE_ON_ROLL", param: 5} → "Recharge 5–6" */
export function formatUsageLimits(usageLimits) {
  if (!usageLimits) {
    return null;
  }
  const { type, param } = usageLimits;
  switch (type) {
    case "PER_DAY":
      return `${param}/Day`;
    case "RECHARGE_ON_ROLL":
      return param >= 6 ? "Recharge 6" : `Recharge ${param}–6`;
    case "RECHARGE":
      return "Recharges after a Short or Long Rest";
    default:
      return null;
  }
}

/** The creature's actions of one type, in stat-block order. */
export function actionsOfType(creature, type) {
  return (creature?.actions ?? [])
    .filter((action) => action.actionType === type)
    .sort((a, b) => (a.orderInStatblock ?? 0) - (b.orderInStatblock ?? 0) || a.name.localeCompare(b.name));
}

/**
 * How many legendary actions the creature can take per round: the number its stat block states ("can take 3
 * legendary actions"), otherwise the usual 3. 0 if it has none.
 */
export function legendaryActionsPerRound(creature) {
  const legendary = actionsOfType(creature, "LEGENDARY_ACTION");
  if (legendary.length === 0) {
    return 0;
  }
  for (const action of legendary) {
    const match = `${action.name} ${action.desc ?? ""}`.match(/can take (\d+) legendary actions/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 3;
}

/** Uses of Legendary Resistance per day, from its trait ("Legendary Resistance (3/Day)"); 0 if none. */
export function legendaryResistancesPerDay(creature) {
  const trait = (creature?.traits ?? []).find((t) => t.name?.toLowerCase().startsWith("legendary resistance"));
  if (!trait) {
    return 0;
  }
  const match = trait.name.match(/(\d+)\s*\/\s*day/i);
  return match ? parseInt(match[1], 10) : 1;
}

/** {perception: 9, sleightOfHand: 4} → [["Perception", "+9"], ["Sleight of Hand", "+4"]] */
export function bonusList(bonuses) {
  return Object.entries(bonuses ?? {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => [labelFromCamelCase(key), formatModifier(value)]);
}

/** "Fire, Cold" style list: the source text when it has one, else the names. */
export function immunityText(display, list) {
  if (display && display.trim()) {
    return capitalizeFirstLetter(display.trim());
  }
  return (list ?? []).map((item) => item.name).join(", ");
}
