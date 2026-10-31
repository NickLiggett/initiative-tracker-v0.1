import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { MAX_ADJUSTMENT, adjustmentDrafts, adjustmentProblems, adjustmentTargets } from "./sheetAdjust";

/**
 * The adjustments of a character's sheet, in a box of their own: for homebrew that bends the rules, a bonus added to a saving
 * throw, skill, passive score or spell number, with the reason. A note can stand alone, such as "Advantage". Everything else
 * on the sheet is changed where it is shown.
 *
 * @param {object} sheet the character's `sheet`
 * @param {(rows: object[]) => void} onSave given the rows (see sheetAdjust.js) once they can be saved
 * @param {() => void} onClose
 */
export default function AdjustmentsDialog({ sheet, onSave, onClose }) {
  const [rows, setRows] = useState(() => adjustmentDrafts(sheet));
  const problems = adjustmentProblems(rows);
  const setRow = (index, field, value) => setRows((current) => current.map((row, at) => (at === index ? { ...row, [field]: value } : row)));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="adjustments-title">
      <DialogTitle id="adjustments-title">Adjustments</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start", pt: "8px !important" }}>
        <Typography variant="body2" color="text.secondary">
          {`For homebrew that bends the rules: add up to ${MAX_ADJUSTMENT} to a saving throw, skill, passive score or spell number, and say why. A note can stand alone, such as "Advantage".`}
        </Typography>
        {rows.length === 0 && <Typography color="text.secondary">No adjustments yet.</Typography>}
        {rows.map((row, index) => (
          <Box key={index} sx={{ display: "grid", gap: 1, gridTemplateColumns: "2fr 100px 3fr auto", alignItems: "start" }}>
            <TextField select size="small" label={`Adjusts, ${index + 1}`} value={row.target} onChange={(event) => setRow(index, "target", event.target.value)}>
              <MenuItem value="">Choose a number</MenuItem>
              {adjustmentTargets().map(({ key, label, group }) => (
                <MenuItem key={key} value={key}>{`${group}: ${label}`}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={`Bonus, ${index + 1}`} value={row.bonus} onChange={(event) => setRow(index, "bonus", event.target.value)} />
            <TextField size="small" label={`Note, ${index + 1}`} value={row.note} onChange={(event) => setRow(index, "note", event.target.value)} />
            <Button color="error" aria-label={`Remove adjustment ${index + 1}`} onClick={() => setRows((current) => current.filter((one, at) => at !== index))}>
              Remove
            </Button>
          </Box>
        ))}
        <Box>
          <Button onClick={() => setRows((current) => [...current, { target: "", bonus: "", note: "" }])}>Add an adjustment</Button>
        </Box>
        {problems.length > 0 && (
          <Alert severity="warning" role="status">
            {problems.map((problem) => (
              <div key={problem}>{problem}</div>
            ))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={problems.length > 0} onClick={() => onSave(rows)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
