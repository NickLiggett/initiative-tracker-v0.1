// The rows of a comparison table, for any kind of content (see ComparisonTable).

/**
 * One line of the table.
 * @typedef {object} CompareRow
 * @property {string} label
 * @property {string[]} values what to show for each of the two things; "—" where there is nothing
 * @property {?number} delta the second's number minus the first's, when both have one
 * @property {?number} higher the index of the one with the bigger number; null when equal or not numeric
 * @property {?string} deltaText how much bigger, for showing next to the bigger one, e.g. "+3"
 * @property {boolean} differs whether the values are different
 */

const NOTHING = "—";

/**
 * A row of numbers. `read(thing)` gives a thing's number (null or undefined if it has none); `format(number, thing)`
 * makes the text for it, the number itself by default; `formatDelta(difference)` makes the text for how much bigger
 * the bigger one is (the difference is always positive), "+3" by default.
 * @param {[object, object]} pair
 * @returns {CompareRow}
 */
export function numberRow(label, pair, read, format = (number) => `${number}`, formatDelta = (gap) => `+${gap}`) {
  const numbers = pair.map((thing) => read(thing) ?? null);
  const values = numbers.map((number, index) => (number === null ? NOTHING : (format(number, pair[index]) ?? NOTHING)));
  // Rounded, so that 0.4 - 0.05 is 0.35 and not 0.35000000000000003.
  const delta = numbers[0] !== null && numbers[1] !== null ? Math.round((numbers[1] - numbers[0]) * 10000) / 10000 : null;
  return {
    label,
    values,
    delta,
    higher: delta ? (delta > 0 ? 1 : 0) : null,
    deltaText: delta ? formatDelta(Math.abs(delta)) : null,
    differs: values[0] !== values[1],
  };
}

/**
 * A row of text. `read(thing)` gives a thing's text; nothing (or empty) shows as "—".
 * @param {[object, object]} pair
 * @returns {CompareRow}
 */
export function textRow(label, pair, read) {
  const values = pair.map((thing) => read(thing) || NOTHING);
  return { label, values, delta: null, higher: null, deltaText: null, differs: values[0] !== values[1] };
}

/** The sections, without the rows that say nothing for either thing, and without the sections left empty. */
export function withoutEmptyRows(sections) {
  return sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => row.values.some((value) => value !== NOTHING)) }))
    .filter((section) => section.rows.length > 0);
}
