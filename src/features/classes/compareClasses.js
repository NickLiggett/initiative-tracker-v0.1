// Lining two classes up, row by row, for the comparison table.

import { textRow, withoutEmptyRows } from "../../components/resource/compareRows";
import { casterLabel, hitDie, names } from "./classFormat";
import { MAX_LEVEL, classAbilities } from "./classTable";

/** The names of the abilities a class gains at a level. */
function abilitiesAt(cls, level) {
  return classAbilities(cls)
    .filter((ability) => ability.levels.includes(level))
    .map((ability) => ability.name)
    .join(", ");
}

/** @returns {{title: string, rows: import("../../components/resource/compareRows").CompareRow[]}[]} */
export function compareClasses(first, second) {
  const pair = [first, second];

  return withoutEmptyRows([
    {
      title: "Overview",
      rows: [
        textRow("Hit die", pair, hitDie),
        textRow("Saving throws", pair, (cls) => names(cls.savingThrows)),
        textRow("Primary ability", pair, (cls) => names(cls.primaryAbilities)),
        textRow("Spellcasting", pair, (cls) => casterLabel(cls.casterType)),
      ],
    },
    {
      title: "Features by level",
      rows: Array.from({ length: MAX_LEVEL }, (_, index) => textRow(`Level ${index + 1}`, pair, (cls) => abilitiesAt(cls, index + 1))),
    },
  ]);
}
