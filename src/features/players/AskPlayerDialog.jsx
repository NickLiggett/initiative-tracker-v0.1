import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { askToPlay } from "../../api/characterRequests";

const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Asks someone, by email address, to play a character. They get an email and play it only once they accept: nobody can be
 * made the player of a character without saying yes.
 *
 * @param {object} player the character
 * @param {(request: object) => void} onAsked given the request that was made (see `askToPlay`)
 * @param {() => void} onClose
 */
export default function AskPlayerDialog({ player, onAsked, onClose }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const valid = LOOKS_LIKE_EMAIL.test(email.trim());

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      onAsked(await askToPlay(player.id, email.trim()));
    } catch (e) {
      setError(e.message || "Couldn't send the request.");
      setSending(false);
    }
  };

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="ask-player-title">
      <DialogTitle id="ask-player-title">{`Request assignment of ${player.name}`}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start" }}>
        <DialogContentText>
          They get an email, and play {player.name} only if they accept. They answer signed in with this address, so use the
          one they use for the app.
        </DialogContentText>
        <TextField
          autoFocus
          type="email"
          size="small"
          label="Their email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && valid && !sending && send()}
          inputProps={{ maxLength: 254 }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!valid || sending} onClick={send}>
          Send request
        </Button>
      </DialogActions>
    </Dialog>
  );
}
