// Small rules for characters (called players in the code), as plain functions.

/** The rule sets a character can use, as the backend's game system keys. */
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

/** "Fighter", or "Fighter 3 / Wizard 2" for a multiclass character; nothing if it has no class. */
export function describeClasses(player) {
  const classes = player.classes ?? [];
  return classes.length > 1 ? classes.map(({ className, level }) => `${className} ${level}`).join(" / ") : player.className;
}

/** "Level 5 Fighter · Dwarf", with whatever is known. */
export function describePlayer(player) {
  const first = ["Level " + player.level, describeClasses(player)].filter(Boolean).join(" ");
  return [first, player.speciesName].filter(Boolean).join(" · ");
}

const OTHER_SOURCES = "Other sources";

/**
 * The classes or species to offer: every one the user can see, those of the chosen rule set first, then those of the
 * other rule set, then the rest (homebrew and other game systems, whose source says neither). Each name once in its
 * group, by name. `items` are Open5e resources, which say which game system their document is in.
 * @returns {{key: string, name: string, group: string}[]}
 */
export function optionsFor(items, ruleset) {
  const known = new Set(RULESETS.map(({ key }) => key));
  const groupOf = (system) => (known.has(system) ? rulesetLabel(system) : OTHER_SOURCES);
  const rank = (system) => (system === ruleset ? 0 : known.has(system) ? 1 : 2);
  const seen = new Set();
  return items
    .map(({ key, name, document }) => ({ key, name, system: document?.gamesystem?.key ?? null }))
    .sort((a, b) => rank(a.system) - rank(b.system) || groupOf(a.system).localeCompare(groupOf(b.system)) || a.name.localeCompare(b.name))
    .filter(({ system, name }) => !seen.has(`${groupOf(system)}|${name}`) && seen.add(`${groupOf(system)}|${name}`))
    .map(({ key, name, system }) => ({ key, name, group: groupOf(system) }));
}

/** The option with this name, ignoring case, if there is one. */
export function optionNamed(options, text) {
  const wanted = text.trim().toLowerCase();
  return wanted ? options.find((option) => option.name.toLowerCase() === wanted) : undefined;
}
