// The encounters a user has saved, as plain functions. They are kept on the user's account (`/api/me/encounters`) as
// `{version, encounters: [...]}`; each is what it takes to build the encounter again:
//
//   { id, name, ruleset, players: [ids of the players ticked], extras: [levels of the characters added by level],
//     monsters: [{key, name, count}], savedAt }
//
// A monster is kept by its key, with its name so that the list can be shown without looking anything up; the stat
// block is fetched again when the encounter is loaded, so it is the creature as it is now.

export const SAVED_VERSION = 1;
export const MAX_NAME_LENGTH = 60;

/** A name as it is kept: trimmed, and no longer than the most allowed. */
export function cleanName(name) {
  return String(name ?? "").trim().slice(0, MAX_NAME_LENGTH);
}

const sameName = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();

/** The encounters in what the account has, without whatever isn't one (so a bad entry doesn't stop the rest). */
export function readSaved(state) {
  const saved = Array.isArray(state?.encounters) ? state.encounters : [];
  return saved
    .filter((one) => one && typeof one === "object" && Number.isInteger(one.id) && cleanName(one.name) !== "")
    .map((one) => ({
      id: one.id,
      name: cleanName(one.name),
      ruleset: typeof one.ruleset === "string" ? one.ruleset : null,
      players: (Array.isArray(one.players) ? one.players : []).filter(Number.isInteger),
      extras: (Array.isArray(one.extras) ? one.extras : []).filter(Number.isInteger),
      monsters: (Array.isArray(one.monsters) ? one.monsters : [])
        .filter((monster) => monster && typeof monster.key === "string" && Number.isInteger(monster.count) && monster.count > 0)
        .map(({ key, name, count }) => ({ key, name: typeof name === "string" ? name : key, count })),
      savedAt: typeof one.savedAt === "string" ? one.savedAt : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What to keep for these encounters. */
export function toState(encounters) {
  return { version: SAVED_VERSION, encounters };
}

/**
 * The encounters with this one saved: it replaces the one with the same name (however it is capitalized), or is added.
 * @param {object[]} encounters as `readSaved` gives them
 * @param {{name: string, ruleset: string, players: number[], extras: number[], monsters: {creature: object, count: number}[]}} draft
 *   as the page has it: monsters with their whole creatures
 * @param {Date} [now]
 */
export function withEncounter(encounters, draft, now = new Date()) {
  const name = cleanName(draft.name);
  const existing = encounters.find((one) => sameName(one.name, name));
  const record = {
    id: existing?.id ?? nextId(encounters),
    name,
    ruleset: draft.ruleset,
    players: [...draft.players],
    extras: [...draft.extras],
    monsters: draft.monsters.map(({ creature, count }) => ({ key: creature.key, name: creature.name, count })),
    savedAt: now.toISOString(),
  };
  return readSaved(toState([...encounters.filter((one) => one.id !== record.id), record]));
}

export function withoutEncounter(encounters, id) {
  return encounters.filter((one) => one.id !== id);
}

/** One more than the highest id so far. */
export function nextId(encounters) {
  return encounters.reduce((highest, one) => Math.max(highest, one.id), 0) + 1;
}

/** Whether an encounter is saved under this name. */
export function isSaved(encounters, name) {
  return cleanName(name) !== "" && encounters.some((one) => sameName(one.name, name));
}

/** "4 Goblin, 1 Ogre · 3 characters": what is in a saved encounter, in a line. */
export function summarize(encounter) {
  const monsters = encounter.monsters.map((monster) => `${monster.count} ${monster.name}`).join(", ") || "no creatures";
  const characters = encounter.players.length + encounter.extras.length;
  return `${monsters} · ${characters} ${characters === 1 ? "character" : "characters"}`;
}
