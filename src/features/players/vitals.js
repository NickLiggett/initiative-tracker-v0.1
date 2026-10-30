// What changes during play for a character (called a player in the code): hit points, conditions, inspiration, death
// saves. The backend keeps them on the character as `vitals`.

/** The official conditions, as the backend names them. Exhaustion is a level of its own. */
export const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

export const MAX_EXHAUSTION = 6;

const FINE = { currentHp: null, tempHp: 0, heroicInspiration: false, conditions: [], exhaustion: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 };

/** The vitals of a character, or those of one that has none yet (a preview, an older reply). */
export function vitalsOf(player) {
  return { ...FINE, currentHp: player.hitPoints ?? null, ...player.vitals };
}

/**
 * How the hit point bar is filled, in percent of the width. With temporary hit points the bar is as wide as the
 * maximum plus those, so the part that is temporary shows beside the part that is real. `null` for a character with no
 * maximum, which has no bar to fill.
 * @returns {{current: number, temp: number}|null}
 */
export function hpBar({ hitPoints }, { currentHp, tempHp }) {
  if (!(hitPoints > 0) || currentHp == null) {
    return null;
  }
  const total = hitPoints + tempHp;
  const current = Math.min(currentHp, hitPoints);
  return { current: (current / total) * 100, temp: (tempHp / total) * 100 };
}

/** How hurt, for the colour of the bar: "healthy" above half, "hurt" above a quarter, else "bloodied". */
export function hpState(maxHp, currentHp) {
  if (!(maxHp > 0)) {
    return "healthy";
  }
  const share = currentHp / maxHp;
  return share > 0.5 ? "healthy" : share > 0.25 ? "hurt" : "bloodied";
}

/** The changes between two sets of vitals, as the backend takes them (only the fields that are different). */
export function vitalsChanges(before, after) {
  const changes = {};
  for (const field of Object.keys(FINE)) {
    const same = Array.isArray(after[field]) ? [...before[field]].sort().join() === [...after[field]].sort().join() : before[field] === after[field];
    if (!same) {
      changes[field] = after[field];
    }
  }
  return changes;
}
