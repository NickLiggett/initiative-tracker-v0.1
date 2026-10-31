import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { DICE, SLOT_LEVELS, resourceProblems } from "./sheetCasting";

/**
 * The totals of a character's spell slots, pact slots and hit dice, to change in a box of its own. What is spent is kept
 * (never more than the new total). The draft is the one `resourceDraft` gives (see sheetCasting.js).
 *
 * @param {object} initial the draft to start from
 * @param {(draft: object) => void} onSave given it when it can be saved
 * @param {() => void} onClose
 */
export default function ResourcesDialog({ initial, onSave, onClose }) {
  const [draft, setDraft] = useState(initial);
  const problems = resourceProblems(draft);
  const setSlot = (level, max) => setDraft((current) => ({ ...current, slots: { ...current.slots, [level]: { ...current.slots[level], max } } }));
  const setPact = (field, value) => setDraft((current) => ({ ...current, pact: { ...current.pact, [field]: value } }));
  const setPool = (index, changes) => setDraft((current) => ({ ...current, hitDice: current.hitDice.map((pool, at) => (at === index ? { ...pool, ...changes } : pool)) }));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="resources-title">
      <DialogTitle id="resources-title">Spell slots and hit dice</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start", pt: "8px !important" }}>
        <Typography variant="body2" color="text.secondary">
          Type how many of each you have; the sheet tracks which are spent.
        </Typography>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
          {SLOT_LEVELS.map((level) => (
            <TextField key={level} size="small" label={`Level ${level} slots`} value={draft.slots[level].max} onChange={(event) => setSlot(level, event.target.value)} inputProps={{ inputMode: "numeric" }} />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Pact slots are all of one level and come back on a short rest.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField size="small" label="Pact slots" value={draft.pact.max} onChange={(event) => setPact("max", event.target.value)} inputProps={{ inputMode: "numeric" }} />
          <TextField size="small" label="Pact slot level" value={draft.pact.level} onChange={(event) => setPact("level", event.target.value)} inputProps={{ inputMode: "numeric" }} />
        </Box>
        {draft.hitDice.map((pool, index) => (
          <Box key={index} sx={{ display: "flex", gap: 1 }}>
            <TextField select size="small" label={`Size of hit dice ${index + 1}`} value={pool.die} onChange={(event) => setPool(index, { die: event.target.value })} sx={{ width: 140 }}>
              {DICE.map((die) => (
                <MenuItem key={die} value={die}>
                  {die}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={`How many hit dice ${index + 1}`} value={pool.max} onChange={(event) => setPool(index, { max: event.target.value })} inputProps={{ inputMode: "numeric" }} />
            <Button color="error" aria-label={`Remove hit dice ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, hitDice: current.hitDice.filter((one, at) => at !== index) }))}>
              Remove
            </Button>
          </Box>
        ))}
        <Box>
          <Button onClick={() => setDraft((current) => ({ ...current, hitDice: [...current.hitDice, { die: "d8", max: "", used: "0" }] }))}>Add hit dice</Button>
        </Box>
        {problems.length > 0 && (
          <Alert severity="warning" role="status">
            {problems.join(" ")}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={problems.length > 0} onClick={() => onSave(draft)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
