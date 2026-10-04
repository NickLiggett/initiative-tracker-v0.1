import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent } from "@mui/material";
import { getPlayer } from "../../api/players";
import PlayerCard from "../players/PlayerCard";

/**
 * A player in the initiative order, as their card: asked for when opened, so it shows the player as they are now (their
 * level and notes may have changed since they were added), or says why it can't.
 * @param {number} playerId
 */
export default function PlayerSheetDialog({ playerId, name, onClose }) {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getPlayer(playerId, { signal: controller.signal })
      .then(setPlayer)
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.status === 404 ? `${name} isn't there any more, or isn't shared with you now.` : "Couldn't load this player.");
        }
      });
    return () => controller.abort();
  }, [playerId, name]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent>
        {error && <Alert severity="warning">{error}</Alert>}
        {!player && !error && <CircularProgress aria-label="Loading" />}
        {player && <PlayerCard player={player} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
