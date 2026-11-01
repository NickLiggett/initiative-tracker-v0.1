import { Box, Button, Chip, Link, Paper, Typography } from "@mui/material";
import { ContentCopy, Delete, OpenInNew, PersonAdd, PersonRemove, Star } from "@mui/icons-material";
import UserAvatar from "../../components/layout/UserAvatar";
import HpBar from "./HpBar";
import { describePlayer, formatBonus, rulesetLabel } from "./players";
import { vitalsOf } from "./vitals";

function Stat({ label, value }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 56 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" component="p">
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

/**
 * One character: who they are, their numbers, and who made them or plays them. Without the handlers it is a
 * preview, with no buttons.
 *
 * @param {object} player as the backend gives it
 * @param {boolean} [busy] turns the buttons off
 * @param {(player: object) => void} [onOpenSheet] opens the character's sheet in a new tab: everything about a character
 * (hit points, inventory, the details) is changed there
 * @param {(player: object) => void} [onDuplicate] only offered for the user's own
 * @param {(player: object) => void} [onDelete] only offered for the user's own
 * @param {object} [request] the request the owner has made to have someone play it (see api/characterRequests), waiting or turned down
 * @param {(player: object) => void} [onAsk] asks someone to play it; only offered for the user's own
 * @param {(request: object) => void} [onCancelRequest] withdraws a waiting request or dismisses a turned-down one
 * @param {(player: object) => void} [onStepDown] stops playing it; only offered to whoever plays but doesn't own it
 */
export default function PlayerCard({ player, busy, onOpenSheet, onDuplicate, onDelete, request, onAsk, onCancelRequest, onStepDown }) {
  const owned = player.role === "OWNER";
  const hasActions = onOpenSheet || onDuplicate || onDelete || onAsk || onStepDown;
  const vitals = vitalsOf(player);
  const afflicted = [...vitals.conditions, ...(vitals.exhaustion > 0 ? [`Exhaustion ${vitals.exhaustion}`] : [])];

  return (
    <Paper variant="outlined" role="group" aria-label={player.name} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h3" sx={{ overflowWrap: "anywhere" }}>
            {onOpenSheet ? (
              <Link component="button" type="button" color="inherit" underline="hover" disabled={busy} onClick={() => onOpenSheet(player)} sx={{ font: "inherit", textAlign: "left" }}>
                {player.name}
              </Link>
            ) : (
              player.name
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describePlayer(player)}
          </Typography>
        </Box>
        <Chip size="small" label={rulesetLabel(player.ruleset)} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-around" }}>
        <Stat label="AC" value={player.armorClass} />
        <Stat label="Init" value={formatBonus(player.initiativeBonus)} />
        {vitals.heroicInspiration && (
          <Box sx={{ textAlign: "center", minWidth: 56 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5, display: "block" }}>
              Insp
            </Typography>
            <Star color="warning" titleAccess="Heroic Inspiration" />
          </Box>
        )}
      </Box>
      <HpBar player={player} />
      {afflicted.length > 0 && (
        <Box component="ul" aria-label="Conditions" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {afflicted.map((condition) => (
            <Box component="li" key={condition}>
              <Chip size="small" color="warning" label={condition} />
            </Box>
          ))}
        </Box>
      )}

      {player.notes && (
        <Typography variant="body2" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>
          {player.notes}
        </Typography>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {owned && player.playedBy && (
          <>
            <UserAvatar username={player.playedBy} size={24} />
            <Typography variant="caption" color="text.secondary">
              Played by {player.playedBy}
            </Typography>
          </>
        )}
        {owned && !player.playedBy && (
          <Typography variant="caption" color="text.secondary">
            Nobody plays this yet
          </Typography>
        )}
        {player.role === "PLAYER" && (
          <>
            <UserAvatar username={player.owner} size={24} />
            <Typography variant="caption" color="text.secondary">
              Made by {player.owner}. You play this one.
            </Typography>
          </>
        )}
        {player.role === "PARTY" && (
          <>
            <UserAvatar username={player.playedBy ?? player.owner} size={24} />
            <Typography variant="caption" color="text.secondary">
              {player.playedBy ? `Played by ${player.playedBy}, made by ${player.owner}` : `Made by ${player.owner}`}
            </Typography>
          </>
        )}
      </Box>

      {owned && request && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color={request.status === "DENIED" ? "warning.main" : "text.secondary"} sx={{ flex: 1, overflowWrap: "anywhere" }}>
            {request.status === "DENIED" ? `${request.email} turned this down` : `Waiting for ${request.email} to answer`}
          </Typography>
          {onCancelRequest && (
            <Button size="small" disabled={busy} onClick={() => onCancelRequest(request)}>
              {request.status === "DENIED" ? "Dismiss" : "Withdraw"}
            </Button>
          )}
        </Box>
      )}

      {hasActions && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {onOpenSheet && (
            <Button size="small" variant="contained" startIcon={<OpenInNew />} disabled={busy} onClick={() => onOpenSheet(player)}>
              Open sheet
            </Button>
          )}
          {owned && onAsk && (
            <Button size="small" startIcon={<PersonAdd />} disabled={busy} onClick={() => onAsk(player)}>
              Ask someone to play
            </Button>
          )}
          {player.role === "PLAYER" && onStepDown && (
            <Button size="small" color="warning" startIcon={<PersonRemove />} disabled={busy} onClick={() => onStepDown(player)}>
              Step down
            </Button>
          )}
          {owned && onDuplicate && (
            <Button size="small" startIcon={<ContentCopy />} disabled={busy} onClick={() => onDuplicate(player)}>
              Duplicate
            </Button>
          )}
          {owned && onDelete && (
            <Button size="small" color="error" startIcon={<Delete />} disabled={busy} onClick={() => onDelete(player)}>
              Delete
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
}
