import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { shareDocument, unshareDocument } from "../../api/documents";
import { loadSharing } from "../../api/sharing";
import ConfirmDialog from "../../components/resource/ConfirmDialog";
import DocumentCard from "./DocumentCard";
import { ROLE_LABELS, sharingErrorMessage } from "./sharing";

/**
 * Share your homebrew with other users by username, and see what has been shared with you. Everything saved in a
 * document is shared with it: viewers can see it and editors can change it too.
 */
export default function SharingPage() {
  const [sharing, setSharing] = useState(null); // see loadSharing; null until loaded
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // {documentKey, documentName, username, leaving}

  const load = useCallback((signal) => {
    setLoadError(null);
    return loadSharing({ signal })
      .then(setSharing)
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLoadError("Couldn't load your documents. Is the backend running?");
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const changeOwned = (documentKey, change) =>
    setSharing((current) => ({
      ...current,
      owned: current.owned.map((entry) =>
        entry.document.key === documentKey ? { ...entry, members: change(entry.members) } : entry,
      ),
    }));

  /** Runs a change to what's shared; on failure shows why and returns false. */
  const attempt = async (username, action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(sharingErrorMessage(e, username));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const share = (documentKey) => (username, role) =>
    attempt(username, async () => {
      const member = await shareDocument(documentKey, username, role);
      changeOwned(documentKey, (members) => [
        ...members.filter((existing) => existing.username !== member.username),
        member,
      ]);
    });

  const changeRole = (documentKey) => async (username, role) => {
    const worked = await attempt(username, async () => {
      await shareDocument(documentKey, username, role);
      changeOwned(documentKey, (members) =>
        members.map((member) => (member.username === username ? { ...member, role } : member)),
      );
    });
    if (!worked) {
      load(); // show what it really is
    }
  };

  const confirm = async () => {
    const { documentKey, username, leaving } = confirming;
    await attempt(username, async () => {
      await unshareDocument(documentKey, username);
      if (leaving) {
        setSharing((current) => ({ ...current, shared: current.shared.filter((entry) => entry.document.key !== documentKey) }));
      } else {
        changeOwned(documentKey, (members) => members.filter((member) => member.username !== username));
      }
    });
    setConfirming(null); // done, or the message saying why not is showing
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 900, p: 2, boxSizing: "border-box", display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          Sharing
        </Typography>
        <Typography color="text.secondary">
          Share your homebrew with other people by their username. They see your creatures and items when they search,
          and if they can edit, they can change them too.
        </Typography>
      </Box>

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {!sharing && !loadError && <CircularProgress aria-label="Loading" />}
      {sharing && !sharing.me && <Alert severity="info">Sign in to share your homebrew.</Alert>}

      {sharing?.me && (
        <>
          <Box component="section" aria-label="Your homebrew" sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5" component="h3">
              Your homebrew
            </Typography>
            {sharing.owned.length === 0 && (
              <Typography color="text.secondary">
                You haven't made any homebrew yet. Make a creature or an item and it will be here to share.
              </Typography>
            )}
            {sharing.owned.map((entry) => (
              <DocumentCard
                key={entry.document.key}
                entry={entry}
                me={sharing.me}
                busy={busy}
                onShare={share(entry.document.key)}
                onChangeRole={changeRole(entry.document.key)}
                onRemove={(username) =>
                  setConfirming({ documentKey: entry.document.key, documentName: entry.document.displayName ?? entry.document.name, username })
                }
              />
            ))}
          </Box>

          <Box component="section" aria-label="Shared with you" sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5" component="h3">
              Shared with you
            </Typography>
            {sharing.shared.length === 0 && (
              <Typography color="text.secondary">Nobody has shared anything with you yet.</Typography>
            )}
            {sharing.shared.map(({ document, owner, role }) => (
              <Paper
                key={document.key}
                variant="outlined"
                role="group"
                aria-label={document.displayName ?? document.name}
                sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="h4">
                    {document.displayName ?? document.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shared by {owner ?? "someone"}
                  </Typography>
                </Box>
                {role && <Chip size="small" label={ROLE_LABELS[role] ?? role} />}
                <Button
                  disabled={busy}
                  onClick={() =>
                    setConfirming({
                      documentKey: document.key,
                      documentName: document.displayName ?? document.name,
                      username: sharing.me.username,
                      leaving: true,
                    })
                  }
                >
                  Leave
                </Button>
              </Paper>
            ))}
          </Box>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.leaving ? `Leave ${confirming?.documentName}?` : `Stop sharing with ${confirming?.username}?`}
        text={
          confirming?.leaving
            ? "You will no longer see it. The owner can share it with you again."
            : `${confirming?.username} will no longer see ${confirming?.documentName}. You can share it with them again.`
        }
        confirmLabel={confirming?.leaving ? "Leave" : "Stop sharing"}
        busy={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
      />
    </Box>
  );
}
