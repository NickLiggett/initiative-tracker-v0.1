import ConfirmDialog from "./ConfirmDialog";

/** Asks before something is deleted for good. `from` names the document it is in, "your homebrew" by default. */
export default function ConfirmDeleteDialog({ open, name, from = "your homebrew", busy, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      title={`Delete ${name}?`}
      text={`It will be removed from ${from} for good. This can't be undone.`}
      confirmLabel="Delete"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
