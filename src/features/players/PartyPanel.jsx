import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Box, Button, Chip, CircularProgress, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Delete } from "@mui/icons-material";
import {
  acceptPartyInvitation,
  inviteToParty,
  leaveParty,
  listPartyInvitations,
  listPartyMembers,
  listPartyPlayers,
  removeFromParty,
} from "../../api/party";
import UserAvatar from "../../components/layout/UserAvatar";
import ConfirmDialog from "../../components/resource/ConfirmDialog";
import { normalizeUsername, sharingErrorMessage } from "../sharing/sharing";
import PlayerCard from "./PlayerCard";

/**
 * The party: the friends who agreed to show you their players, the parties you've been asked to join or are in, and the
 * players in your party, which you can see but not change.
 *
 * @param {(invitations: object[]) => void} [onInvitationsChange] told whenever the requests to join a party change
 */
export default function PartyPanel({ onInvitationsChange }) {
  const [party, setParty] = useState(null); // { members, invitations, players }; null until loaded
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(null); // { kind: "remove"|"leave", who }

  const load = useCallback(
    (signal) => {
      setLoadError(null);
      return Promise.all([listPartyMembers({ signal }), listPartyInvitations({ signal }), listPartyPlayers({ signal })])
        .then(([members, invitations, players]) => {
          setParty({ members, invitations, players });
          onInvitationsChange?.(invitations);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setLoadError(e.status === 401 ? "Sign in to use a party." : "Couldn't load your party. Is the backend running?");
          }
        });
    },
    [onInvitationsChange],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Runs a change; on success loads the party again, on failure says why. Resolves to whether it worked. */
  const attempt = async (action, who) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(sharingErrorMessage(e, who));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const target = normalizeUsername(name);
  const problem = !target
    ? "Type a username."
    : party?.members.some((member) => member.username === target)
      ? `${target} is already in your party, or has been asked.`
      : null;

  const add = async (event) => {
    event.preventDefault();
    setTried(true);
    if (problem) {
      return;
    }
    if (await attempt(() => inviteToParty(target), target)) {
      setName("");
      setTried(false);
    }
  };

  const confirm = async () => {
    const { kind, who } = confirming;
    await attempt(() => (kind === "remove" ? removeFromParty(who) : leaveParty(who)), who);
    setConfirming(null);
  };

  const asked = party?.invitations.filter((invitation) => invitation.status === "PENDING") ?? [];
  const joined = party?.invitations.filter((invitation) => invitation.status === "ACCEPTED") ?? [];

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {!party && !loadError && <CircularProgress aria-label="Loading" />}

      {party && (
        <>
          {asked.length > 0 && (
            <Box component="section" aria-label="Asked to join" sx={{ display: "grid", gap: 1 }}>
              <Typography variant="h5" component="h3">
                Asked to join a party
              </Typography>
              {asked.map(({ dm }) => (
                <Paper key={dm} variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <UserAvatar username={dm} size={32} />
                  <Typography sx={{ flex: 1 }}>
                    {dm} asked you to join their party. If you do, they can see your players (and the ones you play) to add
                    them to initiative. They can't change them.
                  </Typography>
                  <Button variant="contained" disabled={busy} onClick={() => attempt(() => acceptPartyInvitation(dm), dm)}>
                    Accept
                  </Button>
                  <Button disabled={busy} onClick={() => attempt(() => leaveParty(dm), dm)}>
                    Decline
                  </Button>
                </Paper>
              ))}
            </Box>
          )}

          <Box component="section" aria-label="Your party" sx={{ display: "grid", gap: 1.5 }}>
            <Typography variant="h5" component="h3">
              Your party
            </Typography>
            <Typography color="text.secondary">
              Ask friends to join your party. Once they accept, their players (and the ones they play) appear below, ready
              to drop into initiative. You can see them but not change them.
            </Typography>
            <Box component="ul" aria-label="People in your party" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
              {party.members.map((member) => (
                <Box key={member.username} component="li" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <UserAvatar username={member.username} size={28} />
                  <Typography sx={{ flex: 1 }}>{member.username}</Typography>
                  <Chip
                    size="small"
                    color={member.status === "ACCEPTED" ? "success" : "default"}
                    label={member.status === "ACCEPTED" ? "In your party" : "Waiting for them to accept"}
                  />
                  <Tooltip title={member.status === "ACCEPTED" ? "Remove from your party" : "Withdraw the request"}>
                    <span>
                      <IconButton
                        aria-label={`${member.status === "ACCEPTED" ? "Remove" : "Withdraw the request to"} ${member.username}`}
                        disabled={busy}
                        onClick={() => setConfirming({ kind: "remove", who: member.username, accepted: member.status === "ACCEPTED" })}
                      >
                        <Delete />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
              {party.members.length === 0 && (
                <Typography component="li" color="text.secondary">
                  Nobody yet.
                </Typography>
              )}
            </Box>
            <Box component="form" noValidate aria-label="Add to your party" onSubmit={add} sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Ask to join (username)"
                value={name}
                error={Boolean(tried && problem)}
                helperText={(tried && problem) || "They need to have signed in to the app once, and they have to accept."}
                onChange={(event) => setName(event.target.value)}
                sx={{ minWidth: 280 }}
              />
              <Button type="submit" variant="contained" disabled={busy} sx={{ height: 40 }}>
                Ask
              </Button>
            </Box>
          </Box>

          {joined.length > 0 && (
            <Box component="section" aria-label="Parties you are in" sx={{ display: "grid", gap: 1 }}>
              <Typography variant="h5" component="h3">
                Parties you're in
              </Typography>
              {joined.map(({ dm }) => (
                <Box key={dm} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <UserAvatar username={dm} size={28} />
                  <Typography sx={{ flex: 1 }}>{dm}'s party</Typography>
                  <Button disabled={busy} onClick={() => setConfirming({ kind: "leave", who: dm })}>
                    Leave
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          <Box component="section" aria-label="Your party's players" sx={{ display: "grid", gap: 1.5 }}>
            <Typography variant="h5" component="h3">
              Your party's players
            </Typography>
            {party.players.length === 0 ? (
              <Typography color="text.secondary">
                None yet. Players show up here once the people in your party have made some.
              </Typography>
            ) : (
              <Box component="ul" aria-label="Party players" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {party.players.map((player) => (
                  <Box component="li" key={player.id} sx={{ display: "grid" }}>
                    <PlayerCard player={player} />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.kind === "leave" ? `Leave ${confirming?.who}'s party?` : confirming?.accepted ? `Remove ${confirming?.who}?` : `Withdraw the request to ${confirming?.who}?`}
        text={
          confirming?.kind === "leave"
            ? `${confirming?.who} will no longer see your players. They can ask you again.`
            : confirming?.accepted
              ? `${confirming?.who}'s players will no longer show in your party. You can ask them again.`
              : `${confirming?.who} won't be asked any more. You can ask them again.`
        }
        confirmLabel={confirming?.kind === "leave" ? "Leave" : confirming?.accepted ? "Remove" : "Withdraw"}
        busy={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
      />
    </Box>
  );
}

/** A small badge for a tab or button: how many requests to join a party are waiting. */
export function RequestsBadge({ count, children }) {
  return (
    <Badge
      color="error"
      badgeContent={count}
      invisible={!count}
      aria-label={count ? `${count} waiting` : undefined}
      sx={{ "& .MuiBadge-badge": { right: -12 } }}
    >
      {children}
    </Badge>
  );
}
