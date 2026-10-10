import { useEffect, useState } from "react";
import { listPartyTrackers } from "../../api/party";

export const POLL_MS = 5000;

/**
 * The DM trackers the user may watch (see `listPartyTrackers`), asked for again every few seconds while the page is
 * showing, since the DM changes them as the fight goes on. The server answers 304 while nothing has changed.
 * @returns {{trackers: ?object[], error: ?string}} `trackers` is null until the first answer
 */
export default function usePartyTrackers() {
  const [trackers, setTrackers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stopped = false;
    let timer = null;
    let controller = null;

    const load = async () => {
      controller = new AbortController();
      try {
        const found = await listPartyTrackers({ signal: controller.signal });
        if (!stopped) {
          setTrackers(found);
          setError(null);
        }
      } catch (e) {
        if (!stopped && e.name !== "AbortError") {
          setError(e.status === 401 ? "Sign in to see your party's tracker." : "Couldn't load your party's tracker. Is the backend running?");
        }
      }
      if (!stopped) {
        timer = setTimeout(tick, POLL_MS);
      }
    };

    // Not asking while the tab is hidden; asking again at once when it is shown.
    const tick = () => {
      if (document.hidden) {
        timer = setTimeout(tick, POLL_MS);
      } else {
        load();
      }
    };
    const onVisible = () => {
      if (!document.hidden && !stopped) {
        clearTimeout(timer);
        controller?.abort();
        load();
      }
    };

    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { trackers, error };
}
