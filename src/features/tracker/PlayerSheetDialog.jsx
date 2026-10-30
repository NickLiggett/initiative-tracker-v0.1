import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent } from "@mui/material";
import { getPlayer } from "../../api/players";
import InventoryDialog from "../players/InventoryDialog";
import PlayerCard from "../players/PlayerCard";
import VitalsDialog from "../players/VitalsDialog";

/**
 * A character in the initiative order, as their card: asked for when opened, so it shows the character as they are now (their
 * level and notes may have changed since they were added), or says why it can't.
 * @param {number} playerId
 */
export default function PlayerSheetDialog({ playerId, name, onClose }) {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showVitals, setShowVitals] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getPlayer(playerId, { signal: controller.signal })
      .then(setPlayer)
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.status === 404 ? `${name} isn't there any more, or isn't shared with you now.` : "Couldn't load this character.");
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
      {showVitals && (
        <VitalsDialog
          player={player}
          onSaved={(changed) => {
            setPlayer(changed);
            setShowVitals(false);
          }}
          onClose={() => setShowVitals(false)}
        />
      )}
      {showInventory && <InventoryDialog player={player} readOnly onClose={() => setShowInventory(false)} />}
      <DialogActions>
        {player && <Button onClick={() => setShowVitals(true)}>Hit points</Button>}
        {player && <Button onClick={() => setShowInventory(true)}>Inventory</Button>}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
