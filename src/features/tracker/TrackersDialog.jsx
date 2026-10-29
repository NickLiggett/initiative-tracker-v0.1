import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import ConfirmDialog from "../../components/resource/ConfirmDialog";
import { createTracker, deleteTracker, listTrackers, openTracker } from "../../api/profile";
import { MAX_TRACKER_NAME_LENGTH } from "./trackerState";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

/**
 * The user's trackers: name the one in use, start a new one (the one in use is put away), or bring a saved one back
 * (the one in use is put away instead). Everything is kept on the account, so a DM can run several groups without
 * wiping out and rebuilding the tracker.
 * @param {string} name the name of the tracker in use
 * @param {(name: string) => void} onRename
 * @param {(action: () => Promise) => Promise} onSwitch saves the tracker in use, runs the action and loads the result
 */
export default function TrackersDialog({ open, name, onRename, onSwitch, onClose }) {
  const [saved, setSaved] = useState(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const controller = new AbortController();
    setSaved(null);
    setError(null);
    listTrackers({ signal: controller.signal }).then(setSaved, (e) => {
      if (e.name !== "AbortError") {
        setError(`Couldn't load your saved trackers: ${e.message}`);
      }
    });
    return () => controller.abort();
  }, [open]);

  /** Runs a change of tracker, and closes on success. */
  const run = async (action, failure) => {
    setBusy(true);
    setError(null);
    try {
      await onSwitch(action);
      setNewName("");
      onClose();
    } catch (e) {
      setError(`${failure}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteTracker(deleting.id);
      setSaved((current) => current.filter((one) => one.id !== deleting.id));
    } catch (e) {
      setError(`Couldn't delete ${deleting.name}: ${e.message}`);
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  const startNew = (event) => {
    event.preventDefault();
    if (newName.trim()) {
      run(() => createTracker(newName.trim()), "Couldn't start a new tracker");
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm" aria-labelledby="trackers-title">
      <DialogTitle id="trackers-title">Trackers</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        <Typography color="text.secondary">
          Put this tracker away to run another group, and bring it back later exactly as you left it. Changes are saved as you go.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="This tracker's name"
          size="small"
          value={name}
          onChange={(event) => onRename(event.target.value.slice(0, MAX_TRACKER_NAME_LENGTH))}
          placeholder="Untitled tracker"
        />

        <Box component="form" sx={{ display: "flex", gap: 1 }} onSubmit={startNew}>
          <TextField
            label="New tracker's name"
            size="small"
            fullWidth
            value={newName}
            onChange={(event) => setNewName(event.target.value.slice(0, MAX_TRACKER_NAME_LENGTH))}
          />
          <Button type="submit" variant="contained" disabled={busy || !newName.trim()} sx={{ whiteSpace: "nowrap" }}>
            Start new
          </Button>
        </Box>

        <Typography variant="subtitle1" component="h3">
          Saved trackers
        </Typography>
        {saved === null && !error && <Typography color="text.secondary">Loading…</Typography>}
        {saved?.length === 0 && <Typography color="text.secondary">Nothing put away yet.</Typography>}
        <List dense disablePadding>
          {saved?.map((one) => (
            <ListItem
              key={one.id}
              divider
              secondaryAction={
                <>
                  <Button size="small" disabled={busy} onClick={() => run(() => openTracker(one.id), `Couldn't open ${one.name}`)}>
                    Open
                  </Button>
                  <Tooltip title={`Delete ${one.name}`}>
                    <IconButton size="small" aria-label={`Delete ${one.name}`} disabled={busy} onClick={() => setDeleting(one)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              }
            >
              <ListItemText
                primary={one.name}
                secondary={`${one.combatants} ${one.combatants === 1 ? "combatant" : "combatants"} · ${when(one.updatedAt)}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this saved tracker?"
        text={deleting ? `${deleting.name} is deleted for good.` : ""}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </Dialog>
  );
}
