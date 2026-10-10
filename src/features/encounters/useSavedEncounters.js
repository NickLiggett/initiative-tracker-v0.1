import { useCallback, useEffect, useState } from "react";
import { getEncounters, saveEncounters } from "../../api/profile";
import { readSaved, toState, withEncounter, withoutEncounter } from "./savedEncounters";

/**
 * The user's saved encounters, kept on their account. A change is made to what the account has at that moment, not to
 * what was loaded, so that saving in two tabs doesn't lose one of them.
 *
 * @returns {{encounters: ?object[], loadError: ?string, save: (draft: object) => Promise<void>, remove: (id: number) => Promise<void>}}
 *   `encounters` is null until loaded; `save` and `remove` reject if the account couldn't be reached
 */
export default function useSavedEncounters() {
  const [encounters, setEncounters] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getEncounters({ signal: controller.signal })
      .then((state) => setEncounters(readSaved(state)))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLoadError(e.status === 401 ? "Sign in to save encounters." : "Couldn't load your saved encounters.");
          setEncounters([]);
        }
      });
    return () => controller.abort();
  }, []);

  const change = useCallback(async (update) => {
    const state = await getEncounters();
    const next = update(readSaved(state));
    await saveEncounters({ ...(state && typeof state === "object" ? state : {}), ...toState(next) });
    setEncounters(next);
  }, []);

  const save = useCallback((draft) => change((current) => withEncounter(current, draft)), [change]);
  const remove = useCallback((id) => change((current) => withoutEncounter(current, id)), [change]);

  return { encounters, loadError, save, remove };
}
