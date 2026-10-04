import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { ContentCopy, Delete, Edit } from "@mui/icons-material";
import UserAvatar from "../../components/layout/UserAvatar";
import { describePlayer, formatBonus, rulesetLabel } from "./players";

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
 * One player character: who they are, their numbers, and who made them or plays them. Without the handlers it is a
 * preview, with no buttons.
 *
 * @param {object} player as the backend gives it
 * @param {boolean} [busy] turns the buttons off
 * @param {(player: object) => void} [onEdit]
 * @param {(player: object) => void} [onDuplicate] only offered for the user's own
 * @param {(player: object) => void} [onDelete] only offered for the user's own
 */
export default function PlayerCard({ player, busy, onEdit, onDuplicate, onDelete }) {
  const owned = player.role === "OWNER";
  const hasActions = onEdit || onDuplicate || onDelete;

  return (
    <Paper variant="outlined" role="group" aria-label={player.name} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h3" sx={{ overflowWrap: "anywhere" }}>
            {player.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describePlayer(player)}
          </Typography>
        </Box>
        <Chip size="small" label={rulesetLabel(player.ruleset)} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-around" }}>
        <Stat label="AC" value={player.armorClass} />
        <Stat label="HP" value={player.hitPoints} />
        <Stat label="Init" value={formatBonus(player.initiativeBonus)} />
      </Box>

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
            Not played by anyone with an account
          </Typography>
        )}
        {!owned && (
          <>
            <UserAvatar username={player.owner} size={24} />
            <Typography variant="caption" color="text.secondary">
              Made by {player.owner}. You play this one.
            </Typography>
          </>
        )}
      </Box>

      {hasActions && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {onEdit && (
            <Button size="small" startIcon={<Edit />} disabled={busy} onClick={() => onEdit(player)}>
              Edit
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
