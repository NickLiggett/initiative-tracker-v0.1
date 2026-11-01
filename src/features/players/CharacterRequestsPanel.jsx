import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { acceptRequest, denyRequest, listReceivedRequests } from "../../api/characterRequests";
import { describePlayer } from "./players";

/**
 * The requests to play a character that wait for the user's answer, shown above everything else on the page while there
 * are any. Nothing is shown otherwise, and nothing if they can't be loaded (the email is the main way to hear of one).
 *
 * @param {(accepted: boolean) => void} [onAnswered] told after a request is answered; a character is now theirs if it was accepted
 */
export default function CharacterRequestsPanel({ onAnswered }) {
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(null); // the id being answered
  const [error, setError] = useState(null);

  const load = useCallback((signal) => {
    return listReceivedRequests({ signal })
      .then(setRequests)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const refresh = () => load();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  const answer = async (request, accept) => {
    setBusy(request.id);
    setError(null);
    try {
      await (accept ? acceptRequest(request.id) : denyRequest(request.id));
      setRequests((current) => current.filter((one) => one.id !== request.id));
      onAnswered?.(accept);
    } catch (e) {
      setError(`Couldn't ${accept ? "accept" : "decline"} the request for ${request.characterName}: ${e.message}`);
      load();
    } finally {
      setBusy(null);
    }
  };

  if (requests.length === 0 && !error) {
    return null;
  }
  return (
    <Box component="section" aria-label="Requests to play a character" sx={{ display: "grid", gap: 1 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {requests.map((request) => (
        <Paper key={request.id} variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography>
              <strong>{request.owner}</strong> asked you to play <strong>{request.characterName}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {describePlayer({ className: request.className, speciesName: request.speciesName, level: request.level, classes: [] })}
              . You play it only if you accept.
            </Typography>
          </Box>
          <Button variant="contained" disabled={busy === request.id} aria-label={`Accept ${request.characterName}`} onClick={() => answer(request, true)}>
            Accept
          </Button>
          <Button disabled={busy === request.id} aria-label={`Decline ${request.characterName}`} onClick={() => answer(request, false)}>
            Decline
          </Button>
        </Paper>
      ))}
    </Box>
  );
}
