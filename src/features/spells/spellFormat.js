// Showing a spell, as plain functions. A spell's coded fields (casting time "bonus-action", "10minutes", ...) are
// Open5e's; these make the words for them.

import { capitalizeFirstLetter } from "../../utils/text";

const ORDINALS = ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

/** 0 → "Cantrip", 3 → "3rd level". */
export function levelName(level) {
  if (level === 0) {
    return "Cantrip";
  }
  return ORDINALS[level] ? `${ORDINALS[level]} level` : `Level ${level}`;
}

/** "3rd-level evocation", "Evocation cantrip", with "(ritual)" for a ritual. */
export function spellKind(spell) {
  const school = spell.school?.name;
  const base =
    spell.level === 0
      ? [school, "cantrip"].filter(Boolean).join(" ")
      : [`${ORDINALS[spell.level] ?? spell.level}-level`, school?.toLowerCase()].filter(Boolean).join(" ");
  return spell.ritual ? `${capitalizeFirstLetter(base)} (ritual)` : capitalizeFirstLetter(base);
}

const FIXED_CASTING_TIMES = { action: "1 action", "bonus-action": "1 bonus action", reaction: "1 reaction", round: "1 round" };

/** "action" → "1 action", "bonus-action" → "1 bonus action", "10minutes" → "10 minutes", "1hour" → "1 hour". */
export function castingTimeText(code) {
  if (!code) {
    return "";
  }
  if (FIXED_CASTING_TIMES[code]) {
    return FIXED_CASTING_TIMES[code];
  }
  const timed = /^(\d+)\s*([a-z]+)$/i.exec(code);
  return timed ? `${timed[1]} ${timed[2]}` : capitalizeFirstLetter(code.replace(/-/g, " "));
}

/** The casting time, with what a reaction is taken in response to. */
export function castingTimeWithCondition(spell) {
  const time = castingTimeText(spell.castingTime);
  return spell.castingTime === "reaction" && spell.reactionCondition?.trim() ? `${time}, ${spell.reactionCondition.trim()}` : time;
}

/** "Self", "Touch", "150 feet": the spell's own words, or its distance. */
export function rangeText(spell) {
  if (spell.rangeText?.trim()) {
    return spell.rangeText.trim();
  }
  return spell.range ? `${spell.range} ${spell.rangeUnit === "ft" ? "feet" : (spell.rangeUnit ?? "feet")}` : "";
}

/** "V, S, M (a tiny ball of bat guano and sulfur)". */
export function componentsText(spell) {
  const parts = [spell.verbal && "V", spell.somatic && "S"].filter(Boolean);
  if (spell.material) {
    const detail = [
      spell.materialSpecified?.trim().replace(/\.$/, ""),
      spell.materialCost > 0 && `worth ${spell.materialCost} gp`,
      spell.materialConsumed && "consumed",
    ].filter(Boolean);
    parts.push(detail.length ? `M (${detail.join(", ")})` : "M");
  }
  return parts.join(", ");
}

/** "Instantaneous", "1 minute", "Concentration, up to 1 minute". */
export function durationText(spell) {
  const duration = spell.duration?.trim();
  if (!duration) {
    return spell.concentration ? "Concentration" : "";
  }
  const shown = capitalizeFirstLetter(duration);
  return spell.concentration && !/^instantaneous$/i.test(duration) ? `Concentration, up to ${duration}` : shown;
}

/** "Dexterity saving throw". */
export function saveText(spell) {
  return spell.savingThrowAbility?.trim() ? `${capitalizeFirstLetter(spell.savingThrowAbility.trim())} saving throw` : "";
}

/** "8d6 fire", "2d6 fire and cold". */
export function damageText(spell) {
  const roll = spell.damageRoll?.trim();
  const types = (spell.damageTypes ?? []).map((type) => type.toLowerCase());
  if (!roll) {
    return types.join(", ");
  }
  return [roll, types.length > 1 ? `${types.slice(0, -1).join(", ")} and ${types.at(-1)}` : types[0]].filter(Boolean).join(" ");
}

/** The average of a damage roll like "8d6", "1d10+3" or "2d6 + 1d4", rounded down; null if it isn't dice. */
export function averageDamage(roll) {
  if (!roll || !/\d+d\d+/i.test(roll)) {
    return null;
  }
  let total = 0;
  for (const [, sign, count, sides, flat] of roll.matchAll(/([+-])?\s*(?:(\d+)d(\d+)|(\d+))/gi)) {
    const direction = sign === "-" ? -1 : 1;
    total += direction * (count ? (Number(count) * (Number(sides) + 1)) / 2 : Number(flat));
  }
  return Math.floor(total);
}

/** "20-foot sphere"; the unit's "ft" is read as feet. */
export function shapeText(spell) {
  if (!spell.shapeType) {
    return "";
  }
  const unit = !spell.shapeSizeUnit || spell.shapeSizeUnit === "feet" || spell.shapeSizeUnit === "ft" ? "foot" : spell.shapeSizeUnit.replace(/s$/, "");
  return spell.shapeSize ? `${spell.shapeSize}-${unit} ${spell.shapeType}` : capitalizeFirstLetter(spell.shapeType);
}

/** "creature" with a count: "1 creature", "up to" is left to the description. */
export function targetText(spell) {
  const type = spell.targetType?.trim();
  if (!type) {
    return "";
  }
  return spell.targetCount ? `${spell.targetCount} ${type}${spell.targetCount === 1 || type === "area" ? "" : "s"}` : capitalizeFirstLetter(type);
}

/** What a casting option is for: "slot_level_4" → "4th-level slot", "player_level_5" → "Character level 5". */
export function castingOptionName(type) {
  const slot = /^slot_level_(\d+)$/.exec(type ?? "");
  if (slot) {
    return `${ORDINALS[Number(slot[1])] ?? slot[1]}-level slot`;
  }
  const player = /^player_level_(\d+)$/.exec(type ?? "");
  if (player) {
    return `Character level ${player[1]}`;
  }
  return type === "default" ? "Base" : capitalizeFirstLetter((type ?? "").replace(/_/g, " "));
}

/** Whether a casting option says anything besides which one it is. */
export function hasDetails(option) {
  return Boolean(option.desc || option.damageRoll || option.targetCount || option.duration || option.range || option.shapeSize || option.concentration);
}
