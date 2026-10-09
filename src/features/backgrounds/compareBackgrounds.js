// Lining two backgrounds up, row by row, for the comparison table.

import { textRow, withoutEmptyRows } from "../../components/resource/compareRows";
import { benefitTypeLabel } from "./backgroundFormat";

/** The kinds of benefit that are short enough to put in the table, in the order of its rows. */
export const SHORT_KINDS = ["ability_score", "skill_proficiency", "tool_proficiency", "language", "equipment", "feat", "feature"];

/** The text of a benefit as one line, without the markdown. */
function oneLine(text) {
  return (text ?? "").replace(/[*_]+/g, "").replace(/\s+/g, " ").trim();
}

/** What a benefit of a short kind says in the table: a feature by its name (its text is below), the rest by their text. */
function summary(benefit) {
  return benefit.type === "feature" ? oneLine(benefit.name) : oneLine(benefit.desc);
}

/** @returns {{title: string, rows: import("../../components/resource/compareRows").CompareRow[]}[]} */
export function compareBackgrounds(first, second) {
  const pair = [first, second];
  const of = (kind) => (background) => (background.benefits ?? []).filter((benefit) => benefit.type === kind).map(summary).filter(Boolean).join("; ");

  return withoutEmptyRows([
    { title: "What it gives", rows: SHORT_KINDS.map((kind) => textRow(benefitTypeLabel(kind), pair, of(kind))) },
  ]);
}

/**
 * What a background says that the table doesn't: the benefits that aren't of a short kind (suggested characteristics,
 * advancement, ...), and every feature in full.
 */
export function longBenefits(background) {
  return (background.benefits ?? []).filter((benefit) => !SHORT_KINDS.includes(benefit.type) || benefit.type === "feature");
}
