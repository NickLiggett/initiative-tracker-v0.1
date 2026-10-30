import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { updateVitals } from "../../api/players";
import { applyHpInput } from "../tracker/combatants";
import { CONDITIONS, MAX_EXHAUSTION, vitalsChanges, vitalsOf } from "./vitals";

/** A whole number from what was typed, or NaN. */
const whole = (text) => (/^\d+$/.test(String(text).trim()) ? parseInt(text, 10) : NaN);

/**
 * What changes during play for one character: hit points (type 7, or +5 to heal, or -7 for damage), temporary hit points,
 * conditions, exhaustion, heroic inspiration and death saves. Whoever can see the character can change these, a DM
 * included, and only what was changed is sent, so it can't undo what someone else has just done.
 *
 * @param {object} player as the backend gives it
 * @param {(player: object) => void} onSaved given the character as it is now
 */
export default function VitalsDialog({ player, onSaved, onClose }) {
  const before = vitalsOf(player);
  const max = player.hitPoints;
  const [hp, setHp] = useState(String(before.currentHp ?? ""));
  const [tempHp, setTempHp] = useState(String(before.tempHp));
  const [conditions, setConditions] = useState(before.conditions);
  const [exhaustion, setExhaustion] = useState(before.exhaustion);
  const [inspired, setInspired] = useState(before.heroicInspiration);
  const [successes, setSuccesses] = useState(before.deathSaveSuccesses);
  const [failures, setFailures] = useState(before.deathSaveFailures);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const adjusting = /^\s*[+-]/.test(hp); // damage and healing stop at 0 and at the maximum, as a character does
  const applied = hp.trim() === "" ? before.currentHp : applyHpInput(before.currentHp ?? 0, hp);
  const typed = adjusting && !Number.isNaN(applied) ? Math.min(Math.max(applied, 0), max ?? Infinity) : applied;
  const hpProblem =
    typed == null || Number.isNaN(typed) || typed < 0 || (max != null && typed > max)
      ? `Hit points must be 0${max != null ? ` to ${max}` : " or more"}.`
      : null;
  const tempProblem = Number.isNaN(whole(tempHp)) || whole(tempHp) > 999 ? "Temporary hit points must be 0 to 999." : null;

  const after = {
    currentHp: hpProblem ? before.currentHp : typed,
    tempHp: tempProblem ? before.tempHp : whole(tempHp),
    heroicInspiration: inspired,
    conditions,
    exhaustion,
    deathSaveSuccesses: successes,
    deathSaveFailures: failures,
  };
  const changes = vitalsChanges(before, after);

  const toggle = (condition) =>
    setConditions((current) => (current.includes(condition) ? current.filter((one) => one !== condition) : [...current, condition]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateVitals(player.id, changes));
    } catch (e) {
      setError(e.message || "Couldn't save.");
      setSaving(false);
    }
  };

  const pips = (label, value, onChange) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 70 }}>
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

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="vitals-title">
      <DialogTitle id="vitals-title">{player.name}: hit points and conditions</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
          <TextField
            label="Hit points"
            value={hp}
            onChange={(event) => setHp(event.target.value)}
            error={Boolean(hpProblem)}
            helperText={hpProblem ?? (max != null ? `of ${max}. Try +5 or -7.` : "Try +5 or -7.")}
          />
          <TextField
            label="Temporary hit points"
            value={tempHp}
            onChange={(event) => setTempHp(event.target.value)}
            error={Boolean(tempProblem)}
            helperText={tempProblem}
          />
        </Box>
        <Box>
          <Typography variant="subtitle2" component="p" gutterBottom>
            Conditions
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {CONDITIONS.map((condition) => (
              <Chip
                key={condition}
                size="small"
                label={condition}
                aria-pressed={conditions.includes(condition)}
                color={conditions.includes(condition) ? "warning" : "default"}
                variant={conditions.includes(condition) ? "filled" : "outlined"}
                onClick={() => toggle(condition)}
              />
            ))}
          </Box>
        </Box>
        <TextField select label="Exhaustion" value={exhaustion} onChange={(event) => setExhaustion(Number(event.target.value))}>
          {Array.from({ length: MAX_EXHAUSTION + 1 }, (_, level) => (
            <MenuItem key={level} value={level}>
              {level === 0 ? "None" : `Level ${level}`}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={inspired} onChange={(event) => setInspired(event.target.checked)} />}
          label="Heroic Inspiration"
        />
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="subtitle2" component="p">
            Death saving throws
          </Typography>
          {pips("Successes", successes, setSuccesses)}
          {pips("Failures", failures, setFailures)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving || Boolean(hpProblem) || Boolean(tempProblem) || Object.keys(changes).length === 0}
          onClick={save}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
