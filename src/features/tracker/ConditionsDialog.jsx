import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { CONDITIONS } from "../players/vitals";

/**
 * Which of the official conditions a row in the initiative order has (a character's or a creature's). Tap one to turn it
 * on or off. A character's row shares them with the character: they show on its sheet too.
 *
 * @param {object} combatant the row
 * @param {(conditions: string[]) => void} onSave given the conditions the row should have
 */
export default function ConditionsDialog({ combatant, onSave, onClose }) {
  const [chosen, setChosen] = useState(combatant.conditions ?? []);
  const toggle = (condition) => setChosen((current) => (current.includes(condition) ? current.filter((one) => one !== condition) : [...current, condition]));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="conditions-title">
      <DialogTitle id="conditions-title">{combatant.name}: conditions</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {CONDITIONS.map((condition) => (
            <Chip
              key={condition}
              label={condition}
              aria-pressed={chosen.includes(condition)}
              color={chosen.includes(condition) ? "warning" : "default"}
              variant={chosen.includes(condition) ? "filled" : "outlined"}
              onClick={() => toggle(condition)}
            />
          ))}
        </Box>
        {combatant.playerId != null && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            These are kept on the character too, so its sheet shows them.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(CONDITIONS.filter((condition) => chosen.includes(condition)))}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
