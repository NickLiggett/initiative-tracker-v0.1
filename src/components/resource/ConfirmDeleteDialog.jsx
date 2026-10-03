import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

/** Asks before something of the user's is deleted for good. */
export default function ConfirmDeleteDialog({ open, name, busy, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={() => !busy && onCancel()}>
      <DialogTitle>Delete {name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>It will be removed from your homebrew for good. This can't be undone.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button color="error" onClick={onConfirm} disabled={busy}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
