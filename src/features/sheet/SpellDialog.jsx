import { useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField } from "@mui/material";
import { spellDrafts, spellProblems } from "./sheetCasting";

/**
 * One spell of a character's sheet, to change in a box of its own: its name and level (a spell typed by hand starts at
 * 1st), what it says about itself, and a note. Delete takes it off the sheet. The row is the editor's draft of it (see
 * sheetCasting.js); `onSave` is given it when it can be saved.
 *
 * @param {object} initial the row to start from
 * @param {(row: object) => void} onSave
 * @param {() => void} onDelete
 * @param {() => void} onClose
 */
export default function SpellDialog({ initial, onSave, onDelete, onClose }) {
  const [row, setRow] = useState(initial);
  const change = (field) => (event) => setRow((current) => ({ ...current, [field]: event.target.value }));
  const toggle = (field) => (event) => setRow((current) => ({ ...current, [field]: event.target.checked }));
  const problems = spellProblems({ ...spellDrafts({}), spells: [row] });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="spell-title">
      <DialogTitle id="spell-title">Change a spell</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start", pt: "8px !important" }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField size="small" label="Name" value={row.name} onChange={change("name")} sx={{ flex: "3 1 200px" }} />
          <TextField size="small" label="Level" value={row.level} onChange={change("level")} helperText="0 for a cantrip" sx={{ flex: "1 1 90px" }} inputProps={{ inputMode: "numeric" }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField size="small" label="School" value={row.school} onChange={change("school")} sx={{ flex: "1 1 120px" }} />
          <TextField size="small" label="Casting time" value={row.castingTime} onChange={change("castingTime")} sx={{ flex: "1 1 120px" }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField size="small" label="Range" value={row.range} onChange={change("range")} sx={{ flex: "1 1 120px" }} />
          <TextField size="small" label="Duration" value={row.duration} onChange={change("duration")} sx={{ flex: "1 1 120px" }} />
        </Box>
        <Box>
          <FormControlLabel control={<Checkbox checked={row.concentration} onChange={toggle("concentration")} />} label="Concentration" />
          <FormControlLabel control={<Checkbox checked={row.ritual} onChange={toggle("ritual")} />} label="Ritual" />
        </Box>
        <TextField size="small" multiline minRows={2} label="Notes" value={row.notes} onChange={change("notes")} />
        {problems.length > 0 && (
          <Alert severity="warning" role="status">
            {problems.join(" ")}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={onDelete} sx={{ mr: "auto" }}>
          Delete
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!row.name.trim() || problems.length > 0} onClick={() => onSave(row)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
