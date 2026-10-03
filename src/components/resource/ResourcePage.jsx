import { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { Add, CompareArrows, ContentCopy, Delete, Edit } from "@mui/icons-material";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import useOwnedDocuments from "./useOwnedDocuments";

/**
 * A page for one kind of content (creatures, items, ...): search for one and read it, compare it with another,
 * make a new one, and copy, change or delete your own.
 *
 * What differs between kinds is passed in:
 * @param {string} noun e.g. "creature"
 * @param {string} emptyText what to say before anything is chosen
 * @param {(props: {label?: string, value: object, onChange: Function, fullWidth: boolean}) => ReactNode} renderSearch
 * @param {(resource: object) => ReactNode} renderStatBlock
 * @param {(resources: object[]) => ReactNode} renderComparison
 * @param {(props: {resource: ?object, onSaved: Function, onCancel: Function}) => ReactNode} renderEditor
 *   `resource` is the one to change, or null to make a new one
 * @param {(resource: object) => Promise<object>} copy copies one into the user's homebrew; resolves to the copy
 * @param {(resource: object) => Promise} remove deletes one of the user's
 */
export default function ResourcePage({
  noun,
  emptyText,
  renderSearch,
  renderStatBlock,
  renderComparison,
  renderEditor,
  copy,
  remove,
}) {
  const [resource, setResource] = useState(null);
  const [other, setOther] = useState(null);
  const [comparing, setComparing] = useState(false);
  // While set, the editor is showing: { resource } is the one being changed, or null for a new one.
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState(null);
  const { owned, refresh: refreshOwned } = useOwnedDocuments();

  const canChange = Boolean(resource && owned.has(resource.document?.key));

  const stopComparing = () => {
    setComparing(false);
    setOther(null);
  };

  const duplicate = async () => {
    setBusy(true);
    setError(null);
    try {
      setEditing({ resource: await copy(resource) });
      refreshOwned(); // the copy may be the first thing in their homebrew document
      stopComparing();
    } catch (e) {
      setError(`Couldn't duplicate ${resource.name}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteResource = async () => {
    setBusy(true);
    setError(null);
    try {
      await remove(resource);
      setResource(null);
    } catch (e) {
      setError(`Couldn't delete ${resource.name}: ${e.message}`);
    } finally {
      setConfirmingDelete(false);
      setBusy(false);
    }
  };

  const saved = (savedResource) => {
    setResource(savedResource);
    setEditing(null);
    refreshOwned();
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, p: 2, boxSizing: "border-box" }}>
      {editing ? (
        <Box key={editing.resource?.key ?? "new"}>
          {renderEditor({ resource: editing.resource, onSaved: saved, onCancel: () => setEditing(null) })}
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1 }}>{renderSearch({ value: resource, onChange: setResource, fullWidth: true })}</Box>
            {comparing && (
              <Box sx={{ flex: 1 }}>
                {renderSearch({ label: "Compare with", value: other, onChange: setOther, fullWidth: true })}
              </Box>
            )}
            {comparing ? (
              <Button onClick={stopComparing}>Stop comparing</Button>
            ) : (
              <>
                <Button startIcon={<CompareArrows />} disabled={!resource} onClick={() => setComparing(true)}>
                  Compare
                </Button>
                <Button startIcon={<ContentCopy />} disabled={!resource || busy} onClick={duplicate}>
                  Duplicate
                </Button>
                {canChange && (
                  <>
                    <Button startIcon={<Edit />} onClick={() => setEditing({ resource })}>
                      Edit
                    </Button>
                    <Button color="error" startIcon={<Delete />} disabled={busy} onClick={() => setConfirmingDelete(true)}>
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ resource: null })}>
              New {noun}
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {resource && other ? (
            renderComparison([resource, other])
          ) : resource ? (
            <>
              {comparing && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Choose a second {noun} to compare with.
                </Typography>
              )}
              {renderStatBlock(resource)}
            </>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
              {emptyText}
            </Typography>
          )}
        </>
      )}

      <ConfirmDeleteDialog
        open={confirmingDelete}
        name={resource?.name}
        busy={busy}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteResource}
      />
    </Box>
  );
}
