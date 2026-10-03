import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

/**
 * Asks before something is done. Cancel and the confirm button are off while `busy`.
 * @param {string} title
 * @param {string} text
 * @param {string} confirmLabel e.g. "Delete"
 */
export default function ConfirmDialog({ open, title, text, confirmLabel, busy = false, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={() => !busy && onCancel()}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button color="error" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
