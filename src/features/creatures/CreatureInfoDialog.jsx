import { Dialog, DialogContent } from "@mui/material";
import CreatureStatBlock from "./CreatureStatBlock";

/** A creature's stat block in a dialog. */
export default function CreatureInfoDialog({ open, onClose, creature }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogContent dividers>
        <CreatureStatBlock creature={creature} />
      </DialogContent>
    </Dialog>
  );
}
