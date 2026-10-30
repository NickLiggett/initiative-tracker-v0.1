import { useEffect, useRef } from "react";
import { getPlayer, updateVitals } from "../../api/players";
import { onPlayerChanged } from "../../api/playerChanges";
import { updateCombatant } from "./combatants";

/** How long to wait after the last change to a row's hit points before telling the character, so typing is one write. */
export const SYNC_DELAY_MS = 800;

/** How often the characters in the order are looked at, for changes made on their sheets, while the page is in view. */
export const LOOK_MS = 10000;

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
 * The changes to make to a row because its character was changed somewhere else (a sheet, another device), or null. A
 * figure counts as changed there when the character's differs from the one last agreed (`known`), and it is only taken
 * if the row still has that figure: a row that was changed here since is the table's, and goes to the character instead.
 * @returns {{hp?: number, tempHp?: number}|null}
 */
export function remoteChanges(combatant, known, player) {
  const vitals = player?.vitals;
  if (!vitals) {
    return null;
  }
  const changes = {};
  if (Number.isFinite(vitals.currentHp) && vitals.currentHp !== known.hp && combatant.hp === known.hp) {
    changes.hp = vitals.currentHp;
  }
  const remoteTemp = vitals.tempHp > 0 ? vitals.tempHp : 0;
  const rowTemp = combatant.tempHp > 0 ? combatant.tempHp : 0;
  if (remoteTemp !== known.tempHp && rowTemp === known.tempHp) {
    changes.tempHp = remoteTemp;
  }
  return Object.keys(changes).length ? changes : null;
}

/**
 * Keeps the character's own hit points and the tracker's in step, both ways.
 *
 * To the character: when the hit points or temporary hit points of a row that is a character change, a moment later the
 * character is told. Rows are only written when they change after the tracker has loaded, never as it loads. A write that
 * fails is dropped (the character may have been unshared, or deleted); the tracker keeps what the table said.
 *
 * From the character: the characters in the order are looked at when the page comes back into view, when another tab of
 * this browser changes one, and every ten seconds. A row whose character was changed somewhere else takes the new figures,
 * through `setCombatants` (the state's own setter, so it is not a step to undo), unless the row has a change of its own
 * waiting to be written or in flight, which wins. A look that began before the last write of a row is ignored for it.
 *
 * @param {object[]} combatants
 * @param {number} loadKey changes when another tracker is loaded, which starts what is known afresh
 * @param {{setCombatants: Function}} options `setCombatants` takes the new list or a function of the old one
 */
export default function useCharacterHpSync(
  combatants,
  loadKey,
  { setCombatants, delay = SYNC_DELAY_MS, lookMs = LOOK_MS, send = updateVitals, fetchPlayer = getPlayer } = {},
) {
  const known = useRef(new Map()); // row id -> {hp, tempHp} as last seen or agreed with the character
  const timers = useRef(new Map());
  const inFlight = useRef(new Set());
  const settled = useRef(new Map()); // row id -> when its last write finished
  const keyed = useRef(loadKey);
  const latest = useRef(combatants);
  latest.current = combatants;
  const apply = useRef(setCombatants);
  apply.current = setCombatants;
  const alive = useRef(true);

  useEffect(() => {
    if (keyed.current !== loadKey) {
      keyed.current = loadKey;
      known.current = new Map();
      timers.current.forEach(clearTimeout);
      timers.current = new Map();
      settled.current = new Map();
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
          known.current.set(combatant.id, { hp: changes.currentHp ?? seen.hp, tempHp: changes.tempHp ?? seen.tempHp });
          inFlight.current.add(combatant.id);
          Promise.resolve(send(combatant.playerId, changes))
            .catch(() => {})
            .finally(() => {
              inFlight.current.delete(combatant.id);
              settled.current.set(combatant.id, Date.now());
            });
        }, delay),
      );
    }
    for (const id of [...known.current.keys()]) {
      if (!present.has(id)) {
        known.current.delete(id);
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        settled.current.delete(id);
      }
    }
  }, [combatants, loadKey, delay, send]);

  useEffect(() => {
    alive.current = true;
    /** Looks at the characters of the rows (only the one with this id, if given) and takes what was changed elsewhere. */
    const look = (onlyPlayerId) => {
      const startedAt = Date.now();
      const ids = [...new Set(latest.current.filter((row) => row.playerId != null && (onlyPlayerId == null || row.playerId === Number(onlyPlayerId))).map((row) => row.playerId))];
      if (!ids.length) {
        return Promise.resolve();
      }
      return Promise.all(ids.map((id) => Promise.resolve(fetchPlayer(id)).then((player) => [id, player]).catch(() => null))).then((results) => {
        if (!alive.current) {
          return;
        }
        const players = new Map(results.filter(Boolean));
        const updates = [];
        for (const row of latest.current) {
          const seen = known.current.get(row.id);
          if (!seen || !players.has(row.playerId)) {
            continue;
          }
          if (timers.current.has(row.id) || inFlight.current.has(row.id) || startedAt < (settled.current.get(row.id) ?? 0)) {
            continue;
          }
          const changes = remoteChanges(row, seen, players.get(row.playerId));
          if (changes) {
            known.current.set(row.id, { hp: changes.hp ?? seen.hp, tempHp: changes.tempHp ?? seen.tempHp });
            updates.push([row.id, changes]);
          }
        }
        if (updates.length) {
          apply.current((current) => updates.reduce((list, [id, changes]) => updateCombatant(list, id, changes), current));
        }
      });
    };
    const visible = () => document.visibilityState !== "hidden";
    const onView = () => visible() && look();
    const timer = setInterval(() => visible() && look(), lookMs);
    window.addEventListener("focus", onView);
    document.addEventListener("visibilitychange", onView);
    const stopListening = onPlayerChanged((id) => visible() && look(id));
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", onView);
      document.removeEventListener("visibilitychange", onView);
      stopListening();
    };
  }, [lookMs, fetchPlayer]);
}
