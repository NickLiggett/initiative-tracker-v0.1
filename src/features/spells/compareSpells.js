// Lining two spells up, row by row, for the comparison table.

import { numberRow, textRow, withoutEmptyRows } from "../../components/resource/compareRows";
import {
  averageDamage,
  castingTimeWithCondition,
  componentsText,
  damageText,
  durationText,
  levelName,
  rangeText,
  saveText,
  shapeText,
  targetText,
} from "./spellFormat";

const yesNo = (value) => (value ? "Yes" : "No");

/** @returns {{title: string, rows: import("../../components/resource/compareRows").CompareRow[]}[]} */
export function compareSpells(first, second) {
  const pair = [first, second];

  return withoutEmptyRows([
    {
      title: "Overview",
      rows: [
        numberRow("Level", pair, (spell) => spell.level, (level) => levelName(level), (gap) => `+${gap} ${gap === 1 ? "level" : "levels"}`),
        textRow("School", pair, (spell) => spell.school?.name),
        textRow("Classes", pair, (spell) => (spell.classes ?? []).map((one) => one.name).join(", ")),
        textRow("Casting time", pair, castingTimeWithCondition),
        numberRow("Range", pair, (spell) => (spell.range > 0 ? spell.range : null), (range, spell) => rangeText(spell), (gap) => `+${gap} ft`),
        textRow("Components", pair, componentsText),
        textRow("Duration", pair, durationText),
        textRow("Concentration", pair, (spell) => yesNo(spell.concentration)),
        textRow("Ritual", pair, (spell) => yesNo(spell.ritual)),
      ],
    },
    {
      title: "Effect",
      rows: [
        textRow("Target", pair, targetText),
        textRow("Area", pair, shapeText),
        textRow("Saving throw", pair, saveText),
        textRow("Spell attack", pair, (spell) => (spell.attackRoll ? "Yes" : null)),
        numberRow("Damage", pair, (spell) => averageDamage(spell.damageRoll), (average, spell) => damageText(spell), (gap) => `+${gap} average`),
      ],
    },
  ]);
}

/** Whether both spells have the same description and higher-level text, as the 2014 and 2024 versions sometimes do. */
export function sameDescription(first, second) {
  const text = (spell) => `${(spell.desc ?? "").trim()}\n${(spell.higherLevel ?? "").trim()}`;
  return text(first) === text(second);
}
