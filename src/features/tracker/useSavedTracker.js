import { useCallback, useEffect, useRef, useState } from "react";
import { getCreature } from "../../api/creatures";
import { getTracker, saveTracker } from "../../api/profile";
import { creatureKeys, fromSavedState, nextCombatantId, toSavedState } from "./trackerState";

/** How long to wait after the last change before saving, so a burst of edits is one save. */
export const SAVE_DELAY_MS = 800;

// Saves go one after another, and a tracker that opens waits for the last one: leaving the page and coming straight
// back must find what was just changed, not what it was before.
let lastSave = Promise.resolve();

/**
 * The tracker's combatants, kept on the user's account: loaded when the tracker opens (with their creatures' stat
 * blocks looked up again), and saved a moment after every change, so signing in again, anywhere, finds the tracker
 * as it was left.
 *
 * `status` is "loading", "saving", "saved", "failed" (the last save didn't work; `retry` tries again) or "off" (the
 * saved tracker couldn't be loaded, so nothing is saved, rather than risk replacing it).
 *
 * @returns {{combatants: object[], setCombatants: Function, nextId: {current: number}, status: string, notice: ?string, retry: Function}}
 */
export default function useSavedTracker({ delay = SAVE_DELAY_MS } = {}) {
  const [combatants, setCombatants] = useState([]);
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState(null);
  const nextId = useRef(1);
  const loaded = useRef(false);
  const lastKept = useRef(null); // the JSON of the state the account has, as far as we know
  const timer = useRef(null);
  const latest = useRef(combatants);
  latest.current = combatants;

  /** Saves the combatants as they are now, unless the account already has them so. */
  const save = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const state = toSavedState(latest.current);
    const json = JSON.stringify(state);
    if (!loaded.current) {
      return lastSave;
    }
    if (json === lastKept.current) {
      setStatus("saved");
      return lastSave;
    }
    setStatus("saving");
    lastSave = lastSave
      .then(() => saveTracker(state))
      .then(
        () => {
          lastKept.current = json;
          // another change may have come while this one was being saved
          setStatus(JSON.stringify(toSavedState(latest.current)) === json ? "saved" : "saving");
        },
        () => setStatus("failed"),
      );
    return lastSave;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        await lastSave;
        const state = await getTracker({ signal });
        const found = {};
        let missing = 0;
        await Promise.all(
          creatureKeys(state).map(async (key) => {
            try {
              found[key] = await getCreature(key, { signal });
            } catch (e) {
              if (e.name === "AbortError") {
                throw e;
              }
              missing += 1; // gone, or not shared with the user any more, or the backend hiccuped
            }
          }),
        );
        const restored = fromSavedState(state, found);
        nextId.current = nextCombatantId(restored);
        lastKept.current = JSON.stringify(toSavedState(restored));
        loaded.current = true;
        setCombatants(restored);
        setNotice(
          missing === 0
            ? null
            : `${missing} ${missing === 1 ? "creature" : "creatures"} couldn't be loaded, so the stat ${missing === 1 ? "block isn't" : "blocks aren't"} available.`,
        );
        setStatus("saved");
      } catch (e) {
        if (e.name !== "AbortError") {
          setStatus("off");
        }
      }
    })();

    return () => controller.abort();
  }, []);

  // Save a moment after the combatants change.
  useEffect(() => {
    if (!loaded.current || JSON.stringify(toSavedState(combatants)) === lastKept.current) {
      return;
    }
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, delay);
  }, [combatants, delay, save]);

  // A change waiting to be saved is still saved if the tracker goes away first (the user went to another page).
  useEffect(
    () => () => {
      if (timer.current) {
        save();
      }
    },
    [save],
  );

  return { combatants, setCombatants, nextId, status, notice, retry: save };
}
