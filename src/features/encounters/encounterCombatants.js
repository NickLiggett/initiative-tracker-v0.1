// An encounter as combatants for the initiative tracker.

import { playerCombatant, rollInitiative } from "../tracker/playerCombatants";

/**
 * The combatants for an encounter's monsters, one for each, with the creature's armor class and hit points filled in.
 * A kind with several is numbered ("Goblin 1", "Goblin 2"); a lone one keeps its name. Each kind rolls initiative once
 * and all of it goes at that number, unless `separately`: then each rolls for itself.
 * @param {{creature: object, count: number}[]} monsters
 * @param {{separately?: boolean, random?: () => number}} [options] `random` is the dice, for tests
 */
export function monsterCombatants(monsters, { separately = false, random = Math.random } = {}) {
  return monsters.flatMap(({ creature, count }) => {
    const bonus = creature.initiativeBonus ?? 0;
    const shared = rollInitiative(bonus, random);
    return Array.from({ length: count }, (_, index) => ({
      initiative: separately ? rollInitiative(bonus, random) : shared,
      name: count > 1 ? `${creature.name} ${index + 1}` : creature.name,
      ac: creature.armorClass ?? "",
      hp: creature.hitPoints ?? "",
      reaction: false,
      type: "Creature",
      creature,
    }));
  });
}

/** The combatants for the players, each with an initiative of their own rolled. */
export function playerCombatants(players, { random = Math.random } = {}) {
  return players.map((player) => playerCombatant(player, rollInitiative(player.initiativeBonus ?? 0, random)));
}

/** Highest initiative first; those that are level keep the order they were given in. */
export function byInitiative(combatants) {
  return combatants
    .map((combatant, index) => ({ combatant, index }))
    .sort((a, b) => b.combatant.initiative - a.combatant.initiative || a.index - b.index)
    .map(({ combatant }) => combatant);
}
