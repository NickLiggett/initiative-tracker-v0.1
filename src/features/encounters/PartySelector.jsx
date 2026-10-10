import { useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, TextField, Typography } from "@mui/material";
import { describePlayer } from "../players/players";
import { MAX_LEVEL, MIN_LEVEL } from "./encounterRules";

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, index) => MIN_LEVEL + index);

/**
 * Who the encounter is for: the players to tick (the user's own and their party's), and characters that have no player
 * sheet, added by level alone.
 *
 * @param {?object[]} players null while they load
 * @param {?string} loadError
 * @param {Set<number>} ticked the ids of the players ticked
 * @param {(id: number) => void} onToggle
 * @param {{id: number, level: number}[]} extras
 * @param {(level: number) => void} onAddExtra
 * @param {(id: number) => void} onRemoveExtra
 */
export default function PartySelector({ players, loadError, ticked, onToggle, extras, onAddExtra, onRemoveExtra }) {
  const [level, setLevel] = useState("1");

  return (
    <Box component="section" aria-label="Party">
      <Typography variant="h6" component="h2">
        The party
      </Typography>
      {loadError && <Alert severity="warning">{loadError}</Alert>}
      {!players && !loadError && <CircularProgress size={20} aria-label="Loading players" />}
      {players && players.length === 0 && !loadError && (
        <Typography color="text.secondary">
          You have no players yet: make some on the Players page, or add characters by level below.
        </Typography>
      )}
      {players && players.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {players.map((player) => (
            <Box component="li" key={player.id} sx={{ display: "flex", alignItems: "center" }}>
              <Checkbox checked={ticked.has(player.id)} onChange={() => onToggle(player.id)} inputProps={{ "aria-label": `Include ${player.name}` }} />
              <Box>
                <Typography>{player.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[describePlayer(player), player.role === "PARTY" ? `from ${player.playedBy ?? player.owner}` : null].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Level"
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          sx={{ width: 90 }}
          inputProps={{ "aria-label": "Level of the character to add" }}
        >
          {LEVELS.map((one) => (
            <option key={one} value={one}>
              {one}
            </option>
          ))}
        </TextField>
        <Button onClick={() => onAddExtra(Number(level))}>Add a character</Button>
        {extras.map((extra) => (
          <Chip key={extra.id} label={`Level ${extra.level}`} onDelete={() => onRemoveExtra(extra.id)} deleteIcon={<span aria-label={`Remove the level ${extra.level} character`}>×</span>} />
        ))}
      </Box>
    </Box>
  );
}
