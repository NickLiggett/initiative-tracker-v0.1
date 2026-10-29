import { useCallback, useEffect, useRef, useState } from "react";
import { getCreature } from "../../api/creatures";
import { getTracker, saveTracker } from "../../api/profile";
import { creatureKeys, fromSavedState, nextCombatantId, toSavedState, trackerName } from "./trackerState";

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
 * The tracker has a `name`, kept with it. `switchTracker(action)` saves what is here, runs `action` (which changes
 * which tracker the account has in use: see api/profile.js) and loads the tracker the account then has, so a user can
 * put one tracker away and bring another back.
 *
 * `loadKey` changes each time a tracker is loaded, so what was kept about the one before (such as undo) can be dropped.
 *
 * `status` is "loading", "saving", "saved", "failed" (the last save didn't work; `retry` tries again) or "off" (the
 * saved tracker couldn't be loaded, so nothing is saved, rather than risk replacing it).
 *
 * @returns {{combatants: object[], setCombatants: Function, name: string, setName: Function, switchTracker: Function, loadKey: number, nextId: {current: number}, status: string, notice: ?string, retry: Function}}
 */
export default function useSavedTracker({ delay = SAVE_DELAY_MS } = {}) {
  const [combatants, setCombatants] = useState([]);
  const [name, setName] = useState("");
  const [loadKey, setLoadKey] = useState(0); // changes to load the account's tracker again
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState(null);
  const nextId = useRef(1);
  const loaded = useRef(false);
  const lastKept = useRef(null); // the JSON of the state the account has, as far as we know
  const timer = useRef(null);
  const latest = useRef(combatants);
  latest.current = combatants;
  const latestName = useRef(name);
  latestName.current = name;
  const stateNow = () => toSavedState(latest.current, latestName.current);

  /** Saves the combatants as they are now, unless the account already has them so. */
  const save = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const state = stateNow();
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
          setStatus(JSON.stringify(stateNow()) === json ? "saved" : "saving");
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
        const restoredName = trackerName(state);
        lastKept.current = JSON.stringify(toSavedState(restored, restoredName));
        loaded.current = true;
        setCombatants(restored);
        setName(restoredName);
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
  }, [loadKey]);

  // Save a moment after the combatants change.
  useEffect(() => {
    if (!loaded.current || JSON.stringify(toSavedState(combatants, name)) === lastKept.current) {
      return;
    }
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, delay);
  }, [combatants, name, delay, save]);

  // A change waiting to be saved is still saved if the tracker goes away first (the user went to another page).
  useEffect(
    () => () => {
      if (timer.current) {
        save();
      }
    },
    [save],
  );

  /** Saves this tracker, runs `action`, and loads the tracker the account has afterwards. Throws if it couldn't be saved. */
  const switchTracker = useCallback(
    async (action) => {
      if (!loaded.current) {
        throw new Error("The tracker hasn't loaded yet");
      }
      await save();
      if (JSON.stringify(stateNow()) !== lastKept.current) {
        throw new Error("This tracker couldn't be saved first, so nothing was changed");
      }
      await action();
      loaded.current = false;
      setStatus("loading");
      setLoadKey((key) => key + 1);
    },
    [save],
  );

  return { combatants, setCombatants, name, setName, switchTracker, loadKey, nextId, status, notice, retry: save };
}
