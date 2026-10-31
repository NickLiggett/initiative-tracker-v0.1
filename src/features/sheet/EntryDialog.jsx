import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import { MAX_USES, listProblems } from "./sheetEntries";

const ATTACK_FIELDS = [
  { field: "name", label: "Name", flex: "2 1 160px" },
  { field: "bonus", label: "Hit", flex: "1 1 80px", placeholder: "+9" },
  { field: "damage", label: "Damage", flex: "2 1 140px", placeholder: "1d8+5 slashing" },
];

/**
 * One attack or one feature of a character's sheet, to add or change in a box of its own. Delete is offered for one that
 * exists. The row is the editor's draft of it (see sheetEntries.js); `onSave` is given it when it can be saved.
 *
 * @param {"attack" | "feature"} kind
 * @param {object} initial the row to start from
 * @param {boolean} isNew true for one being added
 * @param {(row: object) => void} onSave
 * @param {() => void} [onDelete]
 * @param {() => void} onClose
 */
export default function EntryDialog({ kind, initial, isNew, onSave, onDelete, onClose }) {
  const [row, setRow] = useState(initial);
  const change = (field) => (event) => setRow((current) => ({ ...current, [field]: event.target.value }));
  const problems = listProblems(kind === "attack" ? { attacks: [row], features: [] } : { attacks: [], features: [row] });
  const empty = !row.name.trim();
  const title = `${isNew ? "Add" : "Change"} ${kind === "attack" ? "an attack" : "a feature"}`;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="entry-title">
      <DialogTitle id="entry-title">{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start", pt: "8px !important" }}>
        {kind === "attack" ? (
          <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {ATTACK_FIELDS.map(({ field, label, flex, placeholder }) => (
                <TextField key={field} size="small" autoFocus={field === "name"} label={label} placeholder={placeholder} value={row[field]} onChange={change(field)} sx={{ flex }} />
              ))}
            </Box>
            <TextField size="small" label="Notes" value={row.notes} onChange={change("notes")} />
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField size="small" autoFocus label="Name" value={row.name} onChange={change("name")} sx={{ flex: "2 1 180px" }} />
              <TextField size="small" label="Source" value={row.source} onChange={change("source")} sx={{ flex: "1 1 120px" }} placeholder="Class, species, feat" />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField size="small" label="Uses" value={row.max} onChange={change("max")} helperText={`1 to ${MAX_USES}, empty if not limited`} sx={{ flex: "1 1 140px" }} />
              <TextField select size="small" label="Comes back on" value={row.per} onChange={change("per")} sx={{ flex: "1 1 160px" }}>
                <MenuItem value="">Not limited</MenuItem>
                <MenuItem value="short">Short rest</MenuItem>
                <MenuItem value="long">Long rest</MenuItem>
              </TextField>
            </Box>
            <TextField size="small" multiline minRows={4} label="Description" value={row.description} onChange={change("description")} />
          </>
        )}
        {problems.length > 0 && (
          <Alert severity="warning" role="status">
            {problems.join(" ")}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <Button color="error" onClick={onDelete} sx={{ mr: "auto" }}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={empty || problems.length > 0} onClick={() => onSave(row)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
