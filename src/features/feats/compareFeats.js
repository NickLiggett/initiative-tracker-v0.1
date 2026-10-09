// Lining two feats up, row by row, for the comparison table.

import { textRow } from "../../components/resource/compareRows";
import { featTypeLabel } from "./featFormat";

/** @returns {{title: string, rows: import("../../components/resource/compareRows").CompareRow[]}[]} */
export function compareFeats(first, second) {
  const pair = [first, second];

  return [
    {
      title: "Overview",
      rows: [
        textRow("Type", pair, (feat) => (feat.type ? `${featTypeLabel(feat.type)} feat` : null)),
        textRow("Prerequisite", pair, (feat) => feat.prerequisite?.trim() || "None"),
      ],
    },
  ];
}

/** Whether both feats say the same, as the 2014 and 2024 versions of a feat sometimes do (the text under "Benefits"). */
export function sameContent(first, second) {
  const content = (feat) => JSON.stringify([(feat.desc ?? "").trim(), (feat.benefits ?? []).map((benefit) => [benefit.name ?? null, (benefit.desc ?? "").trim()])]);
  return content(first) === content(second);
}
