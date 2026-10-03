// Reading and formatting open5e-backend item data (/api/items and /api/magicitems) for display.

import { capitalizeFirstLetter } from "../../utils/text";

/**
 * Magic items and ordinary items have the same shape, but only magic items have a `rarity` field (null or not), so
 * that is how to tell them apart.
 */
export function isMagicItem(item) {
  return "rarity" in item || "requiresAttunement" in item;
}

/** What to call the kind of item. */
export function itemKindName(item) {
  return isMagicItem(item) ? "Magic item" : "Item";
}

/** The cost is in gold pieces: 15 → "15 gp", 0.5 → "5 sp", 0.04 → "4 cp". 0 means nobody said. */
export function formatCost(gold) {
  if (gold === null || gold === undefined || gold === 0) {
    return "—";
  }
  const [amount, coin] = gold >= 1 ? [gold, "gp"] : gold >= 0.1 ? [gold * 10, "sp"] : [gold * 100, "cp"];
  return `${Number(amount.toFixed(2)).toLocaleString("en-US")} ${coin}`;
}

/** 55 → "55 lb". 0 means nobody said. */
export function formatWeight(weight, unit = "lb") {
  return weight === null || weight === undefined || weight === 0 ? "—" : `${Number(weight)} ${unit}`;
}

/** "Requires attunement" or, with the source's wording of who by, "Requires attunement by a spellcaster"; else null. */
export function attunementText(item) {
  if (!item.requiresAttunement) {
    return null;
  }
  const detail = item.attunementDetail?.trim();
  // The source writes the detail in all kinds of case ("Requires Attunement by a Paladin").
  return detail ? capitalizeFirstLetter(detail.toLowerCase()) : "Requires attunement";
}

/** "Martial", "Simple" or "Improvised"; null if it isn't said. */
export function weaponClass(weapon) {
  if (weapon.isMartial) {
    return "Martial";
  }
  if (weapon.isSimple) {
    return "Simple";
  }
  return weapon.isImprovised ? "Improvised" : null;
}

/** {damageDice: "1d8", damageType: {name: "Slashing"}} → "1d8 slashing" */
export function formatDamage(weapon) {
  return [weapon.damageDice, weapon.damageType?.name?.toLowerCase()].filter(Boolean).join(" ") || "—";
}

/** A weapon's average damage from its dice: "2d6" → 7, "1d8" → 4.5, "1" → 1; null if it can't be told. */
export function averageDamage(damageDice) {
  const match = /^(\d+)(?:d(\d+))?$/.exec(damageDice ?? "");
  if (!match) {
    return null;
  }
  const [, count, sides] = match;
  return sides ? (Number(count) * (Number(sides) + 1)) / 2 : Number(count);
}

/**
 * A weapon's properties split into the ordinary ones and the masteries, each as `{name, detail, desc, label}`
 * where the label is "Versatile (1d10)".
 */
export function weaponProperties(weapon) {
  const all = (weapon.properties ?? []).map(({ detail, property }) => ({
    name: property.name,
    detail: detail ?? null,
    desc: property.desc,
    mastery: property.type === "Mastery",
    label: detail ? `${property.name} (${detail})` : property.name,
  }));
  return { properties: all.filter((property) => !property.mastery), masteries: all.filter((property) => property.mastery) };
}

/** "16", "14 + Dex modifier (max 2)", or, for a shield, "+2". */
export function formatArmorClass(armor, item) {
  if (item?.category?.key === "shield" && armor.acBase != null) {
    return `+${armor.acBase}`;
  }
  return armor.acDisplay ?? (armor.acBase == null ? "—" : String(armor.acBase));
}
