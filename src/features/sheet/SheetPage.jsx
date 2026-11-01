import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { saveSheet, updateVitals } from "../../api/players";
import PlayerEditor from "../players/PlayerEditor";
import ConditionPicker from "../players/ConditionPicker";
import ExhaustionMeter from "../players/ExhaustionMeter";
import { vitalsOf } from "../players/vitals";
import AdjustmentsDialog from "./AdjustmentsDialog";
import { withAdjustments } from "./sheetAdjust";
import SheetAbilities from "./SheetAbilities";
import SheetFields from "./SheetFields";
import SheetHeader from "./SheetHeader";
import SheetTabs from "./SheetTabs";
import useDerivedStats from "./useDerivedStats";
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
  const { derived, inventoryChanged } = useDerivedStats(player, setPlayer);
  const [problem, setProblem] = useState(null);
  const [adjusting, setAdjusting] = useState(false); // the adjustments to the sheet's numbers
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
        player={{ ...player, ...derived }}
        onVitals={change}
        onEditDetails={() => setEditingDetails(true)}
        onEditAdjustments={player.role === "PARTY" ? undefined : () => setAdjusting(true)}
        onSheet={player.role === "PARTY" ? undefined : changeSheet}
      />

      {error && <Alert severity="warning">{error} Showing the last it was loaded.</Alert>}
      {problem && (
        <Alert severity="error" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      )}

      <SheetAbilities sheet={player.sheet ?? {}} level={player.level} onChange={player.role === "PARTY" ? undefined : changeSheet} />

      <Paper variant="outlined" component="section" aria-label="Conditions" sx={{ p: 2, display: "grid", gap: 1.5 }}>
        <ConditionPicker conditions={vitals.conditions} onToggle={toggleCondition} />
        <ExhaustionMeter level={vitals.exhaustion} onChange={(level) => change({ exhaustion: level })} />
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="subtitle2" component="h2">
            Death saving throws
          </Typography>
          <Pips label="Successes" value={vitals.deathSaveSuccesses} onChange={(value) => change({ deathSaveSuccesses: value })} />
          <Pips label="Failures" value={vitals.deathSaveFailures} onChange={(value) => change({ deathSaveFailures: value })} />
        </Box>
      </Paper>

      <SheetFields sheet={player.sheet ?? {}} level={player.level} onChange={player.role === "PARTY" ? undefined : changeSheet} />

      <SheetTabs player={player} onChange={player.role === "PARTY" ? undefined : changeSheet} onInventorySaved={inventoryChanged} />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button startIcon={<Refresh />} onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
          {player.playedBy ? `Played by ${player.playedBy}. ` : ""}Made by {player.owner}. This page keeps itself up to date.
        </Typography>
      </Box>
      {adjusting && (
        <AdjustmentsDialog
          sheet={player.sheet ?? {}}
          onSave={(rows) => {
            setAdjusting(false);
            changeSheet(withAdjustments(player.sheet ?? {}, rows));
          }}
          onClose={() => setAdjusting(false)}
        />
      )}
    </Box>
  );
}
