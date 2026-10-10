import { useEffect, useState } from "react";
import { listPartyPlayers } from "../../api/party";
import { listPlayers } from "../../api/players";

/**
 * The characters an encounter can be measured against: the user's own and those of their party. The party is a
 * bonus: without it there are still the user's own characters.
 * @returns {{players: ?object[], loadError: ?string}} `players` is null until they are loaded
 */
export default function useParty() {
  const [players, setPlayers] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([listPlayers({ signal }), listPartyPlayers({ signal }).catch(() => [])])
      .then(([mine, party]) => setPlayers([...mine, ...party]))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLoadError(e.status === 401 ? "Sign in to use your characters." : "Couldn't load your characters. Is the backend running?");
          setPlayers([]);
        }
      });
    return () => controller.abort();
  }, []);

  return { players, loadError };
}
