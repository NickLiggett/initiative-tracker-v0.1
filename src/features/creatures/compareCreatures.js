// Lining two creatures up, row by row, for the comparison table.

import { numberRow, textRow, withoutEmptyRows } from "../../components/resource/compareRows";
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
  return withoutEmptyRows(sections);
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
