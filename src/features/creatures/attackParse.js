// What a creature's action says it does, read from its text: the attack roll, the damage and the saving throw. The text is
// what people read and what every source has (Open5e's structured attacks are missing from about half of the actions,
// and not always right), so this reads the text, in both of its styles:
//
//   2014:  Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (1d8 + 6) piercing damage plus 7 (2d6) fire damage.
//   2024:  Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Piercing damage plus 3 (1d6) Necrotic damage.

import { averageOf, formatDice, parseDice } from "../../utils/dice";

const ATTACK = /(Melee(?:\s+or\s+Ranged)?|Ranged)\s*(Weapon|Spell)?\s*Attack(?:\s+Roll)?\s*[:.]?\s*([+\-−–])\s*(\d+)/i;
const REACH = /reach\s+(\d+)\s*ft/i;
const RANGE = /range\s+(\d+)(?:\s*\/\s*(\d+))?\s*ft/i;
const SAVE = /DC\s+(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throw/i;
// "10 (1d8 + 6) piercing damage", "(2d6) fire damage", "3 (1d4 + 1) bludgeoning, piercing, or slashing damage" or a flat
// "1 Piercing damage". The types are the game's, so that "damage" in the rest of a sentence isn't taken for one.
const TYPE = "(?:acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)";
const TYPES = String.raw`(${TYPE}(?:[\s,]+(?:or\s+)?${TYPE})*)`;
const TERM = new RegExp(
  String.raw`(?:(\d+)\s*)?\(\s*(\d+\s*d\s*\d+(?:\s*[+\-−–]\s*\d+)?)\s*\)\s*${TYPES}\s+damage|(\d+)\s+${TYPES}\s+damage`,
  "gi",
);
// "Hit: 14 (2d8 + 5)", where the text stops before it says what kind of damage
const UNTYPED = /Hit:\s*(\d+)\s*\(\s*(\d+\s*d\s*\d+(?:\s*[+\-−–]\s*\d+)?)\s*\)/i;
const JOIN = /^\s*,?\s*(?:plus|and)\s+$/i;

/**
 * @typedef {object} Damage
 * @property {?import("../../utils/dice").Dice} dice null for a flat amount
 * @property {number} average what it averages (the text's own figure when it has one)
 * @property {string} type "piercing", lower case
 *
 * @typedef {object} ParsedAction
 * @property {?{kind: string, toHit: number, reach: ?number, range: ?{normal: number, long: ?number}}} attack
 *   `kind` is "melee", "ranged" or "melee or ranged"; "spell" is added for spell attacks ("melee spell")
 * @property {Damage[]} damage the damage of a hit (or, with no attack, of the effect), the terms joined by "plus" or "and"
 * @property {?{dc: number, ability: string}} save
 */

/** The text without the markdown around "_Hit:_" and the like. */
function plain(text) {
  return String(text ?? "").replace(/[*_]/g, "").replace(/\s+/g, " ");
}

/** The damage terms the text starts with after `from`, those joined to each other by "plus" or "and". */
function damageFrom(text, from) {
  const terms = [];
  let previousEnd = null;
  TERM.lastIndex = from;
  for (let match = TERM.exec(text); match; match = TERM.exec(text)) {
    if (previousEnd !== null && !JOIN.test(text.slice(previousEnd, match.index))) {
      break;
    }
    const dice = match[2] ? parseDice(match[2].replace(/\s+/g, "")) : null;
    const average = match[1] !== undefined ? Number(match[1]) : dice ? Math.floor(averageOf(dice)) : Number(match[4]);
    terms.push({ dice, average, type: (match[3] ?? match[5]).toLowerCase().replace(/[\s,]+(?:or\s+)?/g, "/") });
    previousEnd = match.index + match[0].length;
  }
  if (terms.length === 0) {
    const untyped = UNTYPED.exec(text.slice(from));
    if (untyped) {
      terms.push({ dice: parseDice(untyped[2].replace(/\s+/g, "")), average: Number(untyped[1]), type: "" });
    }
  }
  return terms;
}

/**
 * Reads an action's text.
 * @param {string} desc
 * @returns {ParsedAction}
 */
export function parseAction(desc) {
  const text = plain(desc);
  const found = ATTACK.exec(text);
  let attack = null;
  let from = 0;
  if (found) {
    const kind = found[1].toLowerCase();
    const reach = REACH.exec(text);
    const range = RANGE.exec(text);
    attack = {
      kind: found[2]?.toLowerCase() === "spell" ? `${kind} spell` : kind,
      toHit: (found[3] === "+" ? 1 : -1) * Number(found[4]),
      reach: reach ? Number(reach[1]) : null,
      range: range ? { normal: Number(range[1]), long: range[2] ? Number(range[2]) : null } : null,
    };
    from = found.index + found[0].length;
  }
  const save = SAVE.exec(text);
  return {
    attack,
    damage: damageFrom(text, from),
    save: save ? { dc: Number(save[1]), ability: save[2].toLowerCase() } : null,
  };
}

/** What the damage averages in all, rounded down. */
export function averageDamage(damage) {
  return damage.reduce((sum, term) => sum + term.average, 0);
}

/** "1d8 + 6 piercing + 2d6 fire": the damage in a line (a type that was several, "bludgeoning/piercing/slashing"). */
export function describeDamage(damage) {
  return damage
    .map((term) => `${term.dice ? formatDice(term.dice) : term.average} ${term.type}`.trim())
    .join(" + ");
}

/**
 * The creature's action that does the most damage on a hit, among those with an attack roll: its name, bonus and average.
 * Not a round of attacks: a Multiattack says how many it makes in words, which is left as it is.
 * @returns {?{name: string, toHit: number, average: number}}
 */
export function strongestAttack(creature) {
  let best = null;
  for (const action of creature?.actions ?? []) {
    if (action.actionType && action.actionType !== "ACTION") {
      continue;
    }
    const parsed = parseAction(action.desc);
    if (!parsed.attack || parsed.damage.length === 0) {
      continue;
    }
    const average = averageDamage(parsed.damage);
    if (!best || average > best.average) {
      best = { name: action.name, toHit: parsed.attack.toHit, average };
    }
  }
  return best;
}
