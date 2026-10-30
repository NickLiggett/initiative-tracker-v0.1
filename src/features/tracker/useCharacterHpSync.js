import { useEffect, useRef } from "react";
import { updateVitals } from "../../api/players";

/** How long to wait after the last change to a row's hit points before telling the character, so typing is one write. */
export const SYNC_DELAY_MS = 800;

/**
 * The changes to send for a row whose hit points or temporary hit points moved, or null if neither did. Hit points are
 * kept from 0 to the maximum, which is all a character can have.
 */
export function hpChanges(combatant, known) {
  const changes = {};
  const hp = Number.isFinite(combatant.hp) ? Math.max(0, Math.min(combatant.hp, combatant.maxHp ?? Infinity)) : null;
  if (hp !== null && hp !== known.hp) {
    changes.currentHp = hp;
  }
  const tempHp = Number.isFinite(combatant.tempHp) ? Math.max(0, combatant.tempHp) : 0;
  if (tempHp !== known.tempHp) {
    changes.tempHp = tempHp;
  }
  return Object.keys(changes).length ? changes : null;
}

/**
 * Keeps the character's own hit points in step with the tracker: when the hit points or temporary hit points of a row
 * that is a character change, a moment later the character is told, so its sheet and card show the same. Rows are only
 * written when they change after the tracker has loaded, never as it loads. A write that fails is dropped (the
 * character may have been unshared, or deleted); the tracker keeps what the table said.
 *
 * @param {object[]} combatants
 * @param {number} loadKey changes when another tracker is loaded, which starts what is known afresh
 */
export default function useCharacterHpSync(combatants, loadKey, { delay = SYNC_DELAY_MS, send = updateVitals } = {}) {
  const known = useRef(new Map()); // row id -> {hp, tempHp} as last seen or sent
  const timers = useRef(new Map());
  const keyed = useRef(loadKey);

  useEffect(() => {
    if (keyed.current !== loadKey) {
      keyed.current = loadKey;
      known.current = new Map();
      timers.current.forEach(clearTimeout);
      timers.current = new Map();
    }
    const present = new Set();
    for (const combatant of combatants) {
      if (combatant.playerId === undefined || combatant.playerId === null) {
        continue;
      }
      present.add(combatant.id);
      const seen = known.current.get(combatant.id);
      if (!seen) {
        known.current.set(combatant.id, { hp: Number.isFinite(combatant.hp) ? combatant.hp : null, tempHp: combatant.tempHp > 0 ? combatant.tempHp : 0 });
        continue;
      }
      const changes = hpChanges(combatant, seen);
      clearTimeout(timers.current.get(combatant.id));
      if (!changes) {
        timers.current.delete(combatant.id);
        continue;
      }
      timers.current.set(
        combatant.id,
        setTimeout(() => {
          timers.current.delete(combatant.id);
          known.current.set(combatant.id, {
            hp: changes.currentHp ?? seen.hp,
            tempHp: changes.tempHp ?? seen.tempHp,
          });
          Promise.resolve(send(combatant.playerId, changes)).catch(() => {});
        }, delay),
      );
    }
    for (const id of [...known.current.keys()]) {
      if (!present.has(id)) {
        known.current.delete(id);
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
      }
    }
  }, [combatants, loadKey, delay, send]);
}
