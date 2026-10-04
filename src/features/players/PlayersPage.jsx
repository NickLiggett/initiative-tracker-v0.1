import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Tab, Tabs, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { listPartyInvitations } from "../../api/party";
import { deletePlayer, listPlayers } from "../../api/players";
import ConfirmDeleteDialog from "../../components/resource/ConfirmDeleteDialog";
import PartyPanel, { RequestsBadge } from "./PartyPanel";
import PlayerCard from "./PlayerCard";
import PlayerEditor from "./PlayerEditor";
import { duplicateDraft } from "./playerDraft";

/**
 * The user's player characters: the ones they made and the ones they play. Make a new one, copy one, change it or
 * delete it. The Party tab is for friends who show you their players, and for the parties you've been asked to join.
 */
export default function PlayersPage() {
  const [players, setPlayers] = useState(null); // null until loaded
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { player, start }: player null for a new one; start is a copy's draft
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("players");
  const [requests, setRequests] = useState([]); // the parties the user has been asked to join or is in

  const load = useCallback((signal) => {
    setLoadError(null);
    return listPlayers({ signal })
      .then(setPlayers)
      .catch((e) => {
        if (e.name === "AbortError") {
          return;
        }
        setLoadError(e.status === 401 ? "Sign in to keep players." : "Couldn't load your players. Is the backend running?");
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

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
    setPlayers((current) => {
      const others = (current ?? []).filter((existing) => existing.id !== player.id);
      return [...others, player].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditing(null);
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
                Players
              </Typography>
              <Typography color="text.secondary">
                The characters at your table, for the 2014 or the 2024 rules. Add one to your account and drop it into
                initiative whenever it's in the fight. Name a friend who plays one and they'll see it too.
              </Typography>
            </Box>
            {tab === "players" && (
              <Button variant="contained" startIcon={<Add />} disabled={!players} onClick={() => setEditing({ player: null })}>
                New player
              </Button>
            )}
          </Box>
          <Tabs value={tab} onChange={(event, value) => setTab(value)} aria-label="Players or party">
            <Tab value="players" label="Players" />
            <Tab value="party" label={<RequestsBadge count={waiting}>Party</RequestsBadge>} aria-label={waiting ? `Party, ${waiting} waiting` : "Party"} />
          </Tabs>
          {tab === "party" && <PartyPanel onInvitationsChange={setRequests} />}

          {tab === "players" && loadError && <Alert severity="error">{loadError}</Alert>}
          {tab === "players" && error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {tab === "players" && !players && !loadError && <CircularProgress aria-label="Loading" />}
          {tab === "players" && players?.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
              You don't have any players yet. Make one with New player.
            </Typography>
          )}
          {tab === "players" && players?.length > 0 && (
            <Box component="ul" aria-label="Your players" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {players.map((player) => (
                <Box component="li" key={player.id} sx={{ display: "grid" }}>
                  <PlayerCard
                    player={player}
                    busy={busy}
                    onEdit={(chosen) => setEditing({ player: chosen })}
                    onDuplicate={(chosen) => setEditing({ player: null, start: duplicateDraft(chosen) })}
                    onDelete={setDeleting}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        name={deleting?.name}
        from="your players"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
