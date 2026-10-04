// Player characters as combatants, and the dice for their initiative.

/** The combatant for a player character, going into the order at this initiative. It remembers which player it is. */
export function playerCombatant(player, initiative) {
  return {
    initiative,
    name: player.name,
    ac: player.armorClass ?? "",
    hp: player.hitPoints ?? "",
    reaction: false,
    type: "PC",
    creature: null,
    playerId: player.id,
  };
}

/** The ids of the players who are already in the order. */
export function playerIdsIn(combatants) {
  return new Set(combatants.map((combatant) => combatant.playerId).filter((id) => id !== undefined && id !== null));
}

/**
 * A d20 plus the bonus.
 * @param {number} bonus
 * @param {() => number} [random] a number from 0 up to but not including 1, `Math.random` by default
 */
export function rollInitiative(bonus, random = Math.random) {
  return Math.floor(random() * 20) + 1 + bonus;
}

/** A whole number from what was typed ("12", "-1"), or null if it isn't one. */
export function parseInitiative(text) {
  return /^-?\d{1,2}$/.test(String(text).trim()) ? parseInt(text, 10) : null;
}
