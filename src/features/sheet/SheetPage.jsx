import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { saveSheet, updateVitals } from "../../api/players";
import PlayerEditor from "../players/PlayerEditor";
import { CONDITIONS, MAX_EXHAUSTION, vitalsOf } from "../players/vitals";
import SheetEditor from "./SheetEditor";
import SheetAbilities from "./SheetAbilities";
import SheetFields from "./SheetFields";
import SheetHeader from "./SheetHeader";
import SheetTabs from "./SheetTabs";
import useLivePlayer from "./useLivePlayer";

function Pips({ label, value, onChange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 80 }}>
        {label}
      </Typography>
      {[1, 2, 3].map((n) => (
        <Chip
          key={n}
          size="small"
          label={n}
          aria-label={`${label} ${n}`}
          aria-pressed={value >= n}
          color={value >= n ? (label === "Failures" ? "error" : "success") : "default"}
          variant={value >= n ? "filled" : "outlined"}
          onClick={() => onChange(value === n ? n - 1 : n)}
        />
      ))}
    </Box>
  );
}

/**
 * A character's sheet, filling a tab of its own: opened from the app with `?sheet=ID`, and kept up to date as the
 * character changes anywhere (the tracker, another tab, another device). The hit points, conditions and the rest of what
 * changes during play can be changed here and are saved as they are, by anyone who can see the character.
 *
 * @param {number} playerId
 */
export default function SheetPage({ playerId }) {
  const { player, error, setPlayer, reload } = useLivePlayer(playerId);
  const [problem, setProblem] = useState(null);
  const [editing, setEditing] = useState(false); // the sheet's numbers
  const [editingDetails, setEditingDetails] = useState(false); // who the character is: name, classes, level, AC

  useEffect(() => {
    document.title = player ? `${player.name} · Character sheet` : "Character sheet";
  }, [player]);

  /** Saves a change to what changes during play, and shows the character as the backend answers. */
  const change = async (changes) => {
    setProblem(null);
    try {
      setPlayer(await updateVitals(playerId, changes));
    } catch (e) {
      setProblem(e.message || "Couldn't save that.");
    }
  };

  if (!player) {
    return (
      <Box sx={{ p: 3, display: "grid", gap: 2, justifyItems: "center" }}>
        {error ? <Alert severity="warning">{error}</Alert> : <CircularProgress aria-label="Loading" />}
      </Box>
    );
  }

  const vitals = vitalsOf(player);
  /** Saves the sheet as it would be after a use is spent or a rest taken; if someone saved in between, shows theirs instead. */
  const changeSheet = async (sheet) => {
    setProblem(null);
    try {
      setPlayer(await saveSheet(playerId, { version: player.version, sheet }));
    } catch (e) {
      setProblem(e.status === 409 ? "This sheet was just changed somewhere else. It has been reloaded; try that again." : e.message || "Couldn't save that.");
      reload();
    }
  };
  const toggleCondition = (condition) =>
    change({ conditions: vitals.conditions.includes(condition) ? vitals.conditions.filter((one) => one !== condition) : [...vitals.conditions, condition] });

  if (editingDetails) {
    return (
      <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto", p: 2, boxSizing: "border-box" }}>
        <PlayerEditor
          player={player}
          onSaved={(saved) => {
            setPlayer(saved);
            setEditingDetails(false);
          }}
          onCancel={() => setEditingDetails(false)}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 900, mx: "auto", p: 2, boxSizing: "border-box", display: "grid", gap: 2 }}>
      <SheetHeader
        player={player}
        onVitals={change}
        onEditDetails={() => setEditingDetails(true)}
        onEditStats={player.role === "PARTY" ? undefined : () => setEditing(true)}
      />

      {error && <Alert severity="warning">{error} Showing the last it was loaded.</Alert>}
      {problem && (
        <Alert severity="error" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      )}

      <SheetAbilities sheet={player.sheet ?? {}} level={player.level} onChange={player.role === "PARTY" ? undefined : changeSheet} />

      <Paper variant="outlined" component="section" aria-label="Conditions" sx={{ p: 2, display: "grid", gap: 1.5 }}>
        <Typography variant="subtitle2" component="h2">
          Conditions
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {CONDITIONS.map((condition) => (
            <Chip
              key={condition}
              size="small"
              label={condition}
              aria-pressed={vitals.conditions.includes(condition)}
              color={vitals.conditions.includes(condition) ? "warning" : "default"}
              variant={vitals.conditions.includes(condition) ? "filled" : "outlined"}
              onClick={() => toggleCondition(condition)}
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField select size="small" label="Exhaustion" value={vitals.exhaustion} onChange={(event) => change({ exhaustion: Number(event.target.value) })} sx={{ width: 160 }}>
            {Array.from({ length: MAX_EXHAUSTION + 1 }, (_, level) => (
              <MenuItem key={level} value={level}>
                {level === 0 ? "None" : `Level ${level}`}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="subtitle2" component="h2">
            Death saving throws
          </Typography>
          <Pips label="Successes" value={vitals.deathSaveSuccesses} onChange={(value) => change({ deathSaveSuccesses: value })} />
          <Pips label="Failures" value={vitals.deathSaveFailures} onChange={(value) => change({ deathSaveFailures: value })} />
        </Box>
      </Paper>

      <SheetFields sheet={player.sheet ?? {}} level={player.level} onChange={player.role === "PARTY" ? undefined : changeSheet} />

      <SheetTabs player={player} onChange={player.role === "PARTY" ? undefined : changeSheet} />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button startIcon={<Refresh />} onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
          {player.playedBy ? `Played by ${player.playedBy}. ` : ""}Made by {player.owner}. This page keeps itself up to date.
        </Typography>
      </Box>
      {editing && (
        <SheetEditor
          player={player}
          onSaved={(saved) => {
            setPlayer(saved);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </Box>
  );
}
