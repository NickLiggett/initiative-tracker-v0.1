// Lining two items up, row by row, for the comparison table. Either can be an ordinary or a magic item.

import { numberRow, textRow, withoutEmptyRows } from "../../components/resource/compareRows";
import { capitalizeFirstLetter } from "../../utils/text";
import {
  attunementText,
  averageDamage,
  formatArmorClass,
  formatCost,
  formatDamage,
  formatWeight,
  isMagicItem,
  itemKindName,
  weaponClass,
  weaponProperties,
} from "./itemFormat";

/** @returns {{title: string, rows: import("../../components/resource/compareRows").CompareRow[]}[]} */
export function compareItems(first, second) {
  const pair = [first, second];

  return withoutEmptyRows([
    {
      title: "Overview",
      rows: [
        textRow("Kind", pair, itemKindName),
        textRow("Category", pair, (item) => item.category?.name),
        numberRow(
          "Rarity",
          pair,
          (item) => (isMagicItem(item) ? item.rarity?.rank : null),
          (rank, item) => item.rarity.name,
          (gap) => `+${gap} ${gap === 1 ? "rank" : "ranks"}`,
        ),
        textRow("Attunement", pair, (item) => {
          if (!isMagicItem(item)) {
            return null;
          }
          return item.requiresAttunement ? attunementText(item) : "Not required";
        }),
        // A cost or weight of 0 means nobody said, so it isn't something to compare.
        numberRow("Cost", pair, (item) => (item.cost > 0 ? item.cost : null), formatCost, (gap) => `+${formatCost(gap)}`),
        numberRow(
          "Weight",
          pair,
          (item) => (item.weight > 0 ? item.weight : null),
          (weight, item) => formatWeight(weight, item.weightUnit),
          (gap) => `+${Number(gap.toFixed(2))} lb`,
        ),
      ],
    },
    {
      title: "Weapon",
      rows: [
        textRow("Weapon", pair, (item) => item.weapon?.name),
        numberRow(
          "Damage",
          pair,
          (item) => averageDamage(item.weapon?.damageDice),
          (average, item) => formatDamage(item.weapon),
          (gap) => `+${gap} average`,
        ),
        textRow("Class", pair, (item) => item.weapon && weaponClass(item.weapon)),
        textRow("Properties", pair, (item) => item.weapon && labels(weaponProperties(item.weapon).properties)),
        textRow("Mastery", pair, (item) => item.weapon && labels(weaponProperties(item.weapon).masteries)),
      ],
    },
    {
      title: "Armor",
      rows: [
        numberRow("Armor Class", pair, (item) => item.armor?.acBase, (acBase, item) => formatArmorClass(item.armor, item)),
        textRow("Type", pair, (item) => item.armor && capitalizeFirstLetter(item.armor.category)),
        numberRow("Strength required", pair, (item) => (item.armor?.strengthScoreRequired > 0 ? item.armor.strengthScoreRequired : null)),
        textRow("Stealth", pair, (item) => item.armor && (item.armor.grantsStealthDisadvantage ? "Disadvantage" : "No penalty")),
      ],
    },
  ]);
}

/** Whether both items have the same description, as the 2014 and 2024 versions of an item often do. */
export function sameDescription(first, second) {
  const text = (item) => (item.desc ?? "").trim();
  return text(first) !== "" && text(first) === text(second);
}

const labels = (properties) => properties.map((property) => property.label).join(", ");
