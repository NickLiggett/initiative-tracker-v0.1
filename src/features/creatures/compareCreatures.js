// Lining two creatures up, row by row, for the comparison table.

import { capitalizeFirstLetter, labelFromCamelCase } from "../../utils/text";
import {
  ABILITY_ORDER,
  formatChallengeRating,
  formatExperience,
  formatModifier,
  formatSenses,
  formatSpeed,
  immunityText,
  proficiencyBonusFor,
} from "./creatureFormat";

/**
 * One line of the table.
 * @typedef {object} CompareRow
 * @property {string} label
 * @property {string[]} values what to show for each creature
 * @property {?number} delta the second creature's number minus the first's, when both have one
 * @property {?number} higher the index of the creature with the bigger number; null when equal or not numeric
 * @property {boolean} differs whether the values are different
 */

const DEFENSES = [
  ["Damage Vulnerabilities", "damageVulnerabilitiesDisplay", "damageVulnerabilities"],
  ["Damage Resistances", "damageResistancesDisplay", "damageResistances"],
  ["Damage Immunities", "damageImmunitiesDisplay", "damageImmunities"],
  ["Condition Immunities", "conditionImmunitiesDisplay", "conditionImmunities"],
];

/** @returns {{title: string, rows: CompareRow[]}[]} sections for the table; rows empty for both are left out */
export function compareCreatures(first, second) {
  const pair = [first, second];
  const sections = [
    {
      title: "Overview",
      rows: [
        numberRow("Armor Class", pair, (c) => c.armorClass),
        numberRow("Hit Points", pair, (c) => c.hitPoints),
        numberRow("Initiative", pair, (c) => c.initiativeBonus, formatModifier),
        numberRow("Challenge Rating", pair, (c) => c.challengeRating, formatChallengeRating),
        numberRow("Experience", pair, (c) => c.experiencePoints, formatExperience),
        numberRow("Proficiency Bonus", pair, proficiencyBonusFor, formatModifier),
        textRow("Speed", pair, (c) => formatSpeed(c.speedAll ?? c.speed)),
      ],
    },
    {
      title: "Ability scores",
      rows: ABILITY_ORDER.map(([ability]) =>
        numberRow(
          capitalizeFirstLetter(ability),
          pair,
          (c) => c.abilityScores?.[ability],
          (score, c) => {
            const modifier = c.modifiers?.[ability];
            return modifier == null ? `${score}` : `${score} (${formatModifier(modifier)})`;
          },
        ),
      ),
    },
    {
      title: "Saving throws",
      rows: ABILITY_ORDER.map(([ability]) =>
        numberRow(
          capitalizeFirstLetter(ability),
          pair,
          (c) => (c.savingThrowsAll ?? c.savingThrows ?? c.modifiers)?.[ability],
          formatModifier,
        ),
      ),
    },
    { title: "Skills", rows: skillRows(pair) },
    {
      title: "Senses and defenses",
      rows: [
        numberRow("Passive Perception", pair, (c) => c.passivePerception),
        textRow("Senses", pair, formatSenses),
        textRow("Languages", pair, (c) => capitalizeFirstLetter(c.languages?.asString) || "None"),
        ...DEFENSES.map(([label, display, list]) =>
          textRow(label, pair, (c) =>
            capitalizeFirstLetter(
              immunityText(c.resistancesAndImmunities?.[display], c.resistancesAndImmunities?.[list]),
            ),
          ),
        ),
      ],
    },
  ];
  return sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => row.values.some((value) => value !== "—")) }))
    .filter((section) => section.rows.length > 0);
}

/** Lower-cased names of the traits and actions both creatures have. */
export function sharedEntryNames(first, second) {
  const names = (creature) =>
    new Set([...(creature.traits ?? []), ...(creature.actions ?? [])].map((entry) => entry.name.toLowerCase()));
  const secondNames = names(second);
  return new Set([...names(first)].filter((name) => secondNames.has(name)));
}

/** The skills either creature is proficient in, with each creature's bonus (proficient or not). */
function skillRows(pair) {
  const keys = new Set(
    pair.flatMap((creature) =>
      Object.entries(creature.skillBonuses ?? {})
        .filter(([, bonus]) => bonus != null)
        .map(([key]) => key),
    ),
  );
  return [...keys]
    .map((key) => ({ key, label: labelFromCamelCase(key) }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(({ key, label }) =>
      numberRow(label, pair, (c) => (c.skillBonusesAll ?? c.skillBonuses)?.[key] ?? c.skillBonuses?.[key], formatModifier),
    );
}

/** A row of numbers; `format(number, creature)` makes the text, defaulting to the number itself. */
function numberRow(label, pair, read, format = (number) => `${number}`) {
  const numbers = pair.map((creature) => read(creature) ?? null);
  const values = numbers.map((number, index) => (number === null ? "—" : (format(number, pair[index]) ?? "—")));
  const delta = numbers[0] !== null && numbers[1] !== null ? numbers[1] - numbers[0] : null;
  return {
    label,
    values,
    delta,
    higher: delta ? (delta > 0 ? 1 : 0) : null,
    differs: values[0] !== values[1],
  };
}

function textRow(label, pair, read) {
  const values = pair.map((creature) => read(creature) || "—");
  return { label, values, delta: null, higher: null, differs: values[0] !== values[1] };
}
