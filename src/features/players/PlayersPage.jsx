import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tab, Tabs, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { listPartyInvitations } from "../../api/party";
import { cancelRequest, listSentRequests } from "../../api/characterRequests";
import { deletePlayer, listPlayers, stepDownFromPlayer } from "../../api/players";
import ConfirmDeleteDialog from "../../components/resource/ConfirmDeleteDialog";
import AskPlayerDialog from "./AskPlayerDialog";
import CharacterRequestsPanel from "./CharacterRequestsPanel";
import PartyPanel, { RequestsBadge } from "./PartyPanel";
import PlayerCard from "./PlayerCard";
import PlayerEditor from "./PlayerEditor";
import { duplicateDraft } from "./playerDraft";
import { openSheet } from "../sheet/sheetAddress";

/**
 * The user's characters: the ones they made and the ones they play. Make a new one, copy one, change it or
 * delete it. The Party tab is for friends who show you their characters, and for the parties you've been asked to join.
 */
export default function PlayersPage() {
  const [players, setPlayers] = useState(null); // null until loaded
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { player, start }: the character, null for a new one; start is a copy's draft
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // the character just made, with a way to open its sheet
  const [tab, setTab] = useState("players");
  const [requests, setRequests] = useState([]); // the parties the user has been asked to join or is in
  const [sent, setSent] = useState([]); // the requests the user has made to have someone play a character
  const [asking, setAsking] = useState(null); // the character being asked about
  const [stepping, setStepping] = useState(null); // the character the user is asked to confirm stepping down from
  const [notice, setNotice] = useState(null); // { severity, text } about a request just made

  const load = useCallback((signal) => {
    setLoadError(null);
    return listPlayers({ signal })
      .then(setPlayers)
      .catch((e) => {
        if (e.name === "AbortError") {
          return;
        }
        setLoadError(e.status === 401 ? "Sign in to keep characters." : "Couldn't load your characters. Is the backend running?");
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    // A character is changed on its sheet, in a tab of its own: coming back to this one shows what changed.
    const refresh = () => load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  useEffect(() => {
    // Whether each character has a request waiting or turned down; answers arrive while the page is open elsewhere, so look again on return.
    const refresh = (signal) =>
      listSentRequests({ signal })
        .then(setSent)
        .catch(() => {});
    const controller = new AbortController();
    refresh(controller.signal);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    // Only for the badge on the Party tab; the tab itself says if the party can't be loaded.
    const controller = new AbortController();
    listPartyInvitations({ signal: controller.signal })
      .then(setRequests)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const waiting = requests.filter((request) => request.status === "PENDING").length;

  const saved = (player) => {
    // Only a new character (or a copy) is announced; changing one happens on its sheet. A button, not a tab opened for
    // them: a tab opened after the save has gone through is one browsers block.
    setCreated(editing?.player ? null : player);
    setPlayers((current) => {
      const others = (current ?? []).filter((existing) => existing.id !== player.id);
      return [...others, player].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditing(null);
  };

  const asked = (request) => {
    setAsking(null);
    setSent((current) => [...current.filter((one) => one.playerId !== request.playerId), request]);
    setNotice(
      request.emailSent === false
        ? { severity: "warning", text: `The request for ${request.characterName} is made, but the email to ${request.email} couldn't be sent. They can still answer it if they sign in with that address.` }
        : { severity: "success", text: `Asked ${request.email} to play ${request.characterName}. They play it only if they accept.` },
    );
  };

  const withdraw = async (request) => {
    setBusy(true);
    setError(null);
    try {
      await cancelRequest(request.id);
      setSent((current) => current.filter((one) => one.id !== request.id));
    } catch (e) {
      setError(`Couldn't withdraw the request: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmStepDown = async () => {
    setBusy(true);
    setError(null);
    try {
      await stepDownFromPlayer(stepping.id);
      setPlayers((current) => current.filter((existing) => existing.id !== stepping.id));
    } catch (e) {
      setError(`Couldn't step down from ${stepping.name}: ${e.message}`);
    } finally {
      setStepping(null);
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deletePlayer(deleting.id);
      setPlayers((current) => current.filter((existing) => existing.id !== deleting.id));
    } catch (e) {
      setError(`Couldn't delete ${deleting.name}: ${e.message}`);
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, p: 2, boxSizing: "border-box" }}>
      {editing ? (
        <PlayerEditor
          key={editing.player?.id ?? (editing.start ? "copy" : "new")}
          player={editing.player}
          start={editing.start}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
                Characters
              </Typography>
              <Typography color="text.secondary">
                The characters at your table, for the 2014 or the 2024 rules. Add one to your account and drop it into
                initiative whenever it's in the fight. Ask a friend to play one and, once they accept, they'll see it too.
              </Typography>
            </Box>
            {tab === "players" && (
              <Button variant="contained" startIcon={<Add />} disabled={!players} onClick={() => setEditing({ player: null })}>
                New character
              </Button>
            )}
          </Box>
          <CharacterRequestsPanel onAnswered={(accepted) => accepted && load()} />
          <Tabs value={tab} onChange={(event, value) => setTab(value)} aria-label="Characters or party">
            <Tab value="players" label="Characters" />
            <Tab value="party" label={<RequestsBadge count={waiting}>Party</RequestsBadge>} aria-label={waiting ? `Party, ${waiting} waiting` : "Party"} />
          </Tabs>
          {tab === "party" && <PartyPanel onInvitationsChange={setRequests} />}

          {tab === "players" && loadError && <Alert severity="error">{loadError}</Alert>}
          {tab === "players" && created && (
            <Alert
              severity="success"
              onClose={() => setCreated(null)}
              action={
                <Button color="inherit" size="small" aria-label={`Open ${created.name}'s sheet`} onClick={() => openSheet(created.id)}>
                  Open sheet
                </Button>
              }
            >
              {created.name} is made. Open its sheet to fill in the abilities, spells, inventory and the rest.
            </Alert>
          )}
          {tab === "players" && notice && (
            <Alert severity={notice.severity} onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          )}
          {tab === "players" && error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {tab === "players" && !players && !loadError && <CircularProgress aria-label="Loading" />}
          {tab === "players" && players?.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
              You don't have any characters yet. Make one with New character.
            </Typography>
          )}
          {tab === "players" && players?.length > 0 && (
            <Box component="ul" aria-label="Your characters" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {players.map((player) => (
                <Box component="li" key={player.id} sx={{ display: "grid" }}>
                  <PlayerCard
                    player={player}
                    busy={busy}
                    onOpenSheet={(chosen) => openSheet(chosen.id)}
                    onDuplicate={(chosen) => setEditing({ player: null, start: duplicateDraft(chosen) })}
                    onDelete={setDeleting}
                    request={sent.find((one) => one.playerId === player.id)}
                    onAsk={setAsking}
                    onCancelRequest={withdraw}
                    onStepDown={setStepping}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {asking && <AskPlayerDialog player={asking} onAsked={asked} onClose={() => setAsking(null)} />}
      <Dialog open={Boolean(stepping)} onClose={() => setStepping(null)} aria-labelledby="step-down-title">
        <DialogTitle id="step-down-title">{`Step down from ${stepping?.name ?? ""}?`}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {stepping?.owner} keeps {stepping?.name} but you stop seeing it. They can ask you again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStepping(null)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={busy} onClick={confirmStepDown}>
            Step down
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        name={deleting?.name}
        from="your characters"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
