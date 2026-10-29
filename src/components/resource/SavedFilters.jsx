import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemText, Menu, MenuItem, TextField } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { MAX_SAVED_FILTERS, MAX_SAVED_FILTER_NAME_LENGTH } from "../../settings/settings";
import { useSettings } from "../../settings/SettingsContext";

/**
 * Filters kept under a name, for one page: choose one to apply it, or save the filters as they are now. They are kept
 * on the user's account, so they follow them to other browsers.
 * @param {string} page which page they belong to, e.g. "spells"
 * @param {object} defaults the page's filters with nothing chosen: a saved one is applied over these, so one saved
 *   before the page had a filter still works
 * @param {object} filters the page's filters now
 * @param {(filters: object) => void} onApply
 */
export default function SavedFilters({ page, defaults, filters, onApply }) {
  const { settings, update } = useSettings();
  const saved = settings.savedFilters[page] ?? [];
  const [anchor, setAnchor] = useState(null);
  const [naming, setNaming] = useState(null); // the name being typed while saving, or null
  const keep = (list) => update({ savedFilters: { ...settings.savedFilters, [page]: list } });

  const name = (naming ?? "").trim();
  const replaces = saved.some((one) => one.name === name);
  const full = saved.length >= MAX_SAVED_FILTERS && !replaces;

  const save = () => {
    keep([...saved.filter((one) => one.name !== name), { name, filters }]);
    setNaming(null);
  };

  return (
    <>
      <Button size="small" onClick={(event) => setAnchor(event.currentTarget)} sx={{ textTransform: "none" }}>
        Saved filters ▾
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {saved.length === 0 && <MenuItem disabled>Nothing saved yet</MenuItem>}
        {saved.map((one) => (
          <MenuItem
            key={one.name}
            onClick={() => {
              onApply({ ...defaults, ...one.filters });
              setAnchor(null);
            }}
          >
            <ListItemText>{one.name}</ListItemText>
            <IconButton
              size="small"
              edge="end"
              aria-label={`Delete saved filter ${one.name}`}
              onClick={(event) => {
                event.stopPropagation();
                keep(saved.filter((other) => other.name !== one.name));
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
        <MenuItem
          divider={false}
          onClick={() => {
            setNaming("");
            setAnchor(null);
          }}
        >
          Save these filters…
        </MenuItem>
      </Menu>
      <Dialog open={naming !== null} onClose={() => setNaming(null)} fullWidth maxWidth="xs" aria-labelledby="save-filters-title">
        <DialogTitle id="save-filters-title">Save these filters</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            margin="dense"
            value={naming ?? ""}
            onChange={(event) => setNaming(event.target.value.slice(0, MAX_SAVED_FILTER_NAME_LENGTH))}
            onKeyDown={(event) => event.key === "Enter" && name && !full && save()}
            error={full}
            helperText={full ? `You can keep ${MAX_SAVED_FILTERS} here: delete one first` : replaces ? "Replaces the one with this name" : undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNaming(null)}>Cancel</Button>
          <Button variant="contained" disabled={!name || full} onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
