// The item editor's form state, and turning it into what open5e-backend stores for an item or magic item.
//
// A draft starts from an existing item (when editing or duplicating) and keeps the fields the form doesn't show.

import { isMagicItem } from "../../api/items";

/** The coins a cost can be written in, with what each is worth in gold pieces (the backend's unit). */
export const COINS = [
  { value: "gp", gold: 1 },
  { value: "sp", gold: 0.1 },
  { value: "cp", gold: 0.01 },
];

export const WEAPON_CLASSES = [
  { value: "simple", label: "Simple" },
  { value: "martial", label: "Martial" },
  { value: "improvised", label: "Improvised" },
  { value: "", label: "Not specified" },
];

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"];

let lastEntryId = 0;

/** A weapon property for the form: the source's `{name, desc, type}` plus the weapon's own `detail`. */
export function newProperty(property = {}, detail = "") {
  return {
    id: `property-${++lastEntryId}`,
    name: property.name ?? "",
    desc: property.desc ?? "",
    type: property.type ?? null,
    detail: detail ?? "",
  };
}

export function blankWeapon() {
  return { dice: "1d6", damageType: null, weaponClass: "simple", properties: [] };
}

export function blankArmor() {
  return { category: "light", acBase: "11", addDex: true, capDex: "", stealth: false, strength: "" };
}

/**
 * What the form edits. Numbers are strings, as typed. `kind` is "item" or "magic" and cannot change once saved.
 * `weapon` and `armor` are null for an item that isn't one. `base` is the item this started from, if any.
 */
export function blankItemDraft(kind = "item") {
  return {
    base: null,
    kind,
    name: "",
    desc: "",
    category: null,
    costAmount: "",
    costCoin: "gp",
    weight: "",
    rarity: null,
    requiresAttunement: false,
    attunementDetail: "",
    weapon: null,
    armor: null,
  };
}

/** A draft that edits the item as it is. */
export function draftFromItem(item) {
  const { amount, coin } = costParts(item.cost);
  const weapon = item.weapon;
  const armor = item.armor;

  return {
    base: item,
    kind: isMagicItem(item) ? "magic" : "item",
    name: item.name ?? "",
    desc: item.desc ?? "",
    category: item.category ?? null,
    costAmount: amount,
    costCoin: coin,
    weight: item.weight > 0 ? String(Number(item.weight)) : "",
    rarity: item.rarity ?? null,
    requiresAttunement: Boolean(item.requiresAttunement),
    attunementDetail: item.attunementDetail ?? "",
    weapon: weapon
      ? {
          dice: weapon.damageDice ?? "",
          damageType: weapon.damageType ?? null,
          weaponClass: weapon.isMartial ? "martial" : weapon.isSimple ? "simple" : weapon.isImprovised ? "improvised" : "",
          properties: (weapon.properties ?? []).map(({ detail, property }) => newProperty(property, detail)),
        }
      : null,
    armor: armor
      ? {
          category: armor.category ?? "light",
          acBase: text(armor.acBase),
          addDex: Boolean(armor.acAddDexmod),
          capDex: text(armor.acCapDexmod),
          stealth: Boolean(armor.grantsStealthDisadvantage),
          strength: text(armor.strengthScoreRequired || null),
        }
      : null,
  };
}

/** Gold pieces as the coin that reads best: 15 → 15 gp, 0.4 → 4 sp, 0.04 → 4 cp; nothing for 0. */
export function costParts(gold) {
  if (!gold) {
    return { amount: "", coin: "gp" };
  }
  const { value, gold: worth } = gold >= 1 ? COINS[0] : gold >= 0.1 ? COINS[1] : COINS[2];
  return { amount: String(Number((gold / worth).toFixed(2))), coin: value };
}

/** "14 + Dex modifier (max 2)", the way the source writes armor class. */
export function armorClassText(armor) {
  const base = toInteger(armor.acBase);
  if (base === null) {
    return null;
  }
  if (!armor.addDex) {
    return String(base);
  }
  const cap = toInteger(armor.capDex);
  return `${base} + Dex modifier${cap === null ? "" : ` (max ${cap})`}`;
}

/** What is stopping the draft being saved; empty if nothing is. */
export function itemProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the item a name.");
  }
  if (draft.kind === "magic" && !draft.rarity) {
    problems.push("Choose a rarity for the magic item.");
  }
  if (draft.armor && toInteger(draft.armor.acBase) === null) {
    problems.push("Give the armor an armor class.");
  }
  return problems;
}

/**
 * The item JSON for a draft: what the backend takes to create or replace an item or magic item, and what the stat
 * block shows as a preview. An ordinary item has no rarity or attunement fields, which the backend would refuse.
 */
export function itemFromDraft(draft) {
  const { base } = draft;
  const name = draft.name.trim();
  const coin = COINS.find(({ value }) => value === draft.costCoin) ?? COINS[0];
  const costAmount = toNumber(draft.costAmount);

  const item = {
    ...base,
    name,
    desc: draft.desc,
    category: draft.category,
    // rounded, so that 4 sp is 0.4 gold and not 0.4000000000000001; no amount is 0, or null where the source said null
    cost: costAmount === null ? (base?.cost === null ? null : 0) : Math.round(costAmount * coin.gold * 10000) / 10000,
    weight: toNumber(draft.weight) ?? 0,
    weightUnit: base?.weightUnit ?? "lb",
    weapon: draft.weapon ? weaponFromDraft(draft.weapon, base?.weapon, name) : null,
    armor: draft.armor ? armorFromDraft(draft.armor, base?.armor, name) : null,
  };

  if (draft.kind === "magic") {
    item.rarity = draft.rarity;
    item.requiresAttunement = draft.requiresAttunement;
    item.attunementDetail = draft.requiresAttunement ? draft.attunementDetail.trim() || null : null;
  }
  return item;
}

function weaponFromDraft(weapon, base, itemName) {
  return {
    ...base,
    key: base?.key ?? null,
    name: base?.name ?? itemName,
    damageDice: weapon.dice.trim() || null,
    damageType: weapon.damageType,
    distanceUnit: base?.distanceUnit ?? "feet",
    isSimple: weapon.weaponClass === "simple",
    isMartial: weapon.weaponClass === "martial",
    isImprovised: weapon.weaponClass === "improvised",
    properties: weapon.properties.map(({ name, desc, type, detail }) => ({
      detail: detail.trim() || null,
      property: { name, desc, type },
    })),
  };
}

function armorFromDraft(armor, base, itemName) {
  const strength = toInteger(armor.strength);
  return {
    ...base,
    key: base?.key ?? null,
    name: base?.name ?? itemName,
    category: armor.category,
    acDisplay: armorClassText(armor),
    acBase: toInteger(armor.acBase),
    acAddDexmod: armor.addDex,
    acCapDexmod: armor.addDex ? toInteger(armor.capDex) : null,
    grantsStealthDisadvantage: armor.stealth,
    // The source says 0 for "none" on some armor and leaves it out on others; keep whichever it used.
    strengthScoreRequired: strength ?? (base?.strengthScoreRequired === 0 ? 0 : null),
  };
}

function toInteger(value) {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? null : number;
}

function toNumber(value) {
  const number = parseFloat(value);
  return Number.isNaN(number) ? null : number;
}

function text(number) {
  return number === null || number === undefined ? "" : String(number);
}
