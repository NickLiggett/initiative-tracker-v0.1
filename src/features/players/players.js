// Small rules for player characters, as plain functions.

/** The rule sets a player can use, as the backend's game system keys. */
export const RULESETS = [
  { key: "5e-2024", label: "2024 rules" },
  { key: "5e-2014", label: "2014 rules" },
];

export const DEFAULT_RULESET = "5e-2024";

/** "2014 rules", or the key itself for one we don't know. */
export function rulesetLabel(key) {
  return RULESETS.find((ruleset) => ruleset.key === key)?.label ?? key;
}

/** An initiative bonus the way it's written on a sheet: +2, +0, -1. */
export function formatBonus(bonus) {
  return bonus < 0 ? `${bonus}` : `+${bonus}`;
}

/** "Level 5 Fighter · Dwarf", with whatever is known. */
export function describePlayer(player) {
  const first = ["Level " + player.level, player.className].filter(Boolean).join(" ");
  return [first, player.speciesName].filter(Boolean).join(" · ");
}

/**
 * The classes or species of one rule set to offer, each name once, by name. `items` are Open5e resources, which say
 * which game system their document is in.
 * @returns {{key: string, name: string}[]}
 */
export function optionsFor(items, ruleset) {
  const seen = new Set();
  return items
    .filter((item) => item.document?.gamesystem?.key === ruleset)
    .filter((item) => !seen.has(item.name) && seen.add(item.name))
    .map(({ key, name }) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The option with this name, ignoring case, if there is one. */
export function optionNamed(options, text) {
  const wanted = text.trim().toLowerCase();
  return wanted ? options.find((option) => option.name.toLowerCase() === wanted) : undefined;
}
