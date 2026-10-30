import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { ContentCopy, Delete, Edit, Favorite, Inventory2, Star } from "@mui/icons-material";
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
 * @param {(player: object) => void} [onEdit]
 * @param {(player: object) => void} [onInventory] opens what the character carries
 * @param {(player: object) => void} [onVitals] opens the hit points and conditions; anyone who sees the character can
 * @param {(player: object) => void} [onDuplicate] only offered for the user's own
 * @param {(player: object) => void} [onDelete] only offered for the user's own
 */
export default function PlayerCard({ player, busy, onEdit, onInventory, onVitals, onDuplicate, onDelete }) {
  const owned = player.role === "OWNER";
  const hasActions = onEdit || onInventory || onVitals || onDuplicate || onDelete;
  const vitals = vitalsOf(player);
  const afflicted = [...vitals.conditions, ...(vitals.exhaustion > 0 ? [`Exhaustion ${vitals.exhaustion}`] : [])];

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
            Not played by anyone with an account
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

      {hasActions && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {onEdit && (
            <Button size="small" startIcon={<Edit />} disabled={busy} onClick={() => onEdit(player)}>
              Edit
            </Button>
          )}
          {onVitals && (
            <Button size="small" startIcon={<Favorite />} disabled={busy} onClick={() => onVitals(player)}>
              Hit points
            </Button>
          )}
          {onInventory && (
            <Button size="small" startIcon={<Inventory2 />} disabled={busy} onClick={() => onInventory(player)}>
              Inventory
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
