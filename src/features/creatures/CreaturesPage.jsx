import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material";
import { Add, CompareArrows, ContentCopy, Delete, Edit } from "@mui/icons-material";
import { copyCreature, deleteCreature } from "../../api/creatures";
import CreatureComparison from "./CreatureComparison";
import CreatureEditor from "./CreatureEditor";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";
import useOwnedDocuments from "./useOwnedDocuments";

/** Search for a creature and read its stat block, compare it with another, or make, change and delete your own. */
export default function CreaturesPage() {
  const [creature, setCreature] = useState(null);
  const [other, setOther] = useState(null);
  const [comparing, setComparing] = useState(false);
  // While set, the editor is showing: { creature } is the one being changed, or null for a new creature.
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState(null);
  const { owned, refresh: refreshOwned } = useOwnedDocuments();

  const canChange = Boolean(creature && owned.has(creature.document?.key));

  const stopComparing = () => {
    setComparing(false);
    setOther(null);
  };

  const duplicate = async () => {
    setBusy(true);
    setError(null);
    try {
      setEditing({ creature: await copyCreature(creature.key) });
      refreshOwned(); // the copy may be the first thing in their homebrew document
      stopComparing();
    } catch (e) {
      setError(`Couldn't duplicate ${creature.name}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteCreature(creature.key);
      setCreature(null);
    } catch (e) {
      setError(`Couldn't delete ${creature.name}: ${e.message}`);
    } finally {
      setConfirmingDelete(false);
      setBusy(false);
    }
  };

  const saved = (savedCreature) => {
    setCreature(savedCreature);
    setEditing(null);
    refreshOwned();
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, p: 2, boxSizing: "border-box" }}>
      {editing ? (
        <CreatureEditor
          key={editing.creature?.key ?? "new"}
          creature={editing.creature}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1 }}>
              <CreatureSearch value={creature} onChange={setCreature} fullWidth />
            </Box>
            {comparing && (
              <Box sx={{ flex: 1 }}>
                <CreatureSearch label="Compare with" value={other} onChange={setOther} fullWidth />
              </Box>
            )}
            {comparing ? (
              <Button onClick={stopComparing}>Stop comparing</Button>
            ) : (
              <>
                <Button startIcon={<CompareArrows />} disabled={!creature} onClick={() => setComparing(true)}>
                  Compare
                </Button>
                <Button startIcon={<ContentCopy />} disabled={!creature || busy} onClick={duplicate}>
                  Duplicate
                </Button>
                {canChange && (
                  <>
                    <Button startIcon={<Edit />} onClick={() => setEditing({ creature })}>
                      Edit
                    </Button>
                    <Button color="error" startIcon={<Delete />} disabled={busy} onClick={() => setConfirmingDelete(true)}>
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ creature: null })}>
              New creature
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {creature && other ? (
            <CreatureComparison creatures={[creature, other]} />
          ) : creature ? (
            <>
              {comparing && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Choose a second creature to compare with.
                </Typography>
              )}
              <CreatureStatBlock creature={creature} />
            </>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
              Search for a creature to see its stat block.
            </Typography>
          )}
        </>
      )}

      <Dialog open={confirmingDelete} onClose={() => !busy && setConfirmingDelete(false)}>
        <DialogTitle>Delete {creature?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>It will be removed from your homebrew for good. This can't be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingDelete(false)} disabled={busy}>
            Cancel
          </Button>
          <Button color="error" onClick={remove} disabled={busy}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
