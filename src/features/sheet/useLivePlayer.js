import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayer } from "../../api/players";
import { onPlayerChanged } from "../../api/playerChanges";

/** How often a sheet that is in view asks again, to find changes made on another device. */
export const POLL_MS = 10000;

/**
 * A character kept as they are now: loaded when asked for, and loaded again when the tab comes back into view, when
 * another tab of this browser changes them, and every ten seconds while the tab is in view.
 *
 * @returns {{player: ?object, error: ?string, setPlayer: Function, reload: Function}} `error` is set only if there is nothing to show; a
 *   failed look afterwards keeps the last good one
 */
export default function useLivePlayer(id, { pollMs = POLL_MS } = {}) {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  const look = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    return getPlayer(id, { signal: controller.signal })
      .then((fresh) => {
        setPlayer(fresh);
        setError(null);
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          return;
        }
        if (e.status === 404 || e.status === 401) {
          setPlayer(null);
          setError(e.status === 401 ? "Sign in to see this character." : "This character isn't there, or isn't shared with you.");
        } else {
          setError((current) => current ?? "Couldn't load this character.");
        }
      });
  }, [id]);

  useEffect(() => {
    setPlayer(null);
    setError(null);
    look();
    const visible = () => document.visibilityState !== "hidden";
    const onView = () => visible() && look();
    const timer = setInterval(() => visible() && look(), pollMs);
    window.addEventListener("focus", onView);
    document.addEventListener("visibilitychange", onView);
    const stopListening = onPlayerChanged((changed) => Number(changed) === Number(id) && look());
    return () => {
      inFlight.current?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", onView);
      document.removeEventListener("visibilitychange", onView);
      stopListening();
    };
  }, [id, look, pollMs]);

  return { player, error, setPlayer, reload: look };
}
