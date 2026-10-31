import { useState } from "react";
import { Box, Button, Chip, Paper, Popover, TextField, Typography } from "@mui/material";
import { Edit, EditNote, Favorite, Star, StarBorder } from "@mui/icons-material";
import HpBar from "../players/HpBar";
import { describePlayer, formatBonus, rulesetLabel } from "../players/players";
import { vitalsOf } from "../players/vitals";
import EditableField from "./EditableField";
import { walkProblem, withWalkingSpeed } from "./sheetEdits";
import { proficiencyBonus, signed } from "./sheetModel";

const wholeNumber = (text) => (/^\d+$/.test(text.trim()) ? parseInt(text, 10) : NaN);

function Stat({ label, value, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 1, textAlign: "center", minWidth: 84, flex: "1 1 84px" }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5, display: "block" }}>
        {label}
      </Typography>
      {children ?? (
        <Typography variant="h5" component="p">
          {value ?? "—"}
        </Typography>
      )}
    </Paper>
  );
}

/** Damage, healing and temporary hit points, in the panel that opens from the hit points. */
function HpManager({ player, onChange }) {
  const [amount, setAmount] = useState("");
  const vitals = vitalsOf(player);
  const max = player.hitPoints;

  const hit = (sign) => {
    const points = wholeNumber(amount);
    if (Number.isNaN(points) || vitals.currentHp == null) {
      return;
    }
    // Damage uses up temporary hit points first, as it does at the table.
    if (sign < 0) {
      const absorbed = Math.min(vitals.tempHp, points);
      onChange({ currentHp: Math.max(0, vitals.currentHp - (points - absorbed)), ...(absorbed ? { tempHp: vitals.tempHp - absorbed } : {}) });
    } else {
      onChange({ currentHp: Math.min(max ?? Infinity, vitals.currentHp + points) });
    }
    setAmount("");
  };

  return (
    <Box sx={{ p: 2, display: "grid", gap: 1.5, width: 320 }}>
      <Typography variant="subtitle2" component="h2">
        Manage hit points
      </Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField size="small" label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} onKeyDown={(event) => event.key === "Enter" && hit(-1)} sx={{ width: 100 }} />
        <Button variant="outlined" color="error" onClick={() => hit(-1)}>
          Damage
        </Button>
        <Button variant="outlined" color="success" onClick={() => hit(1)}>
          Heal
        </Button>
      </Box>
      <TextField
        size="small"
        label="Temporary hit points"
        defaultValue={vitals.tempHp}
        key={`temp-${vitals.tempHp}`}
        onBlur={(event) => {
          const next = wholeNumber(event.target.value);
          if (!Number.isNaN(next) && next <= 999 && next !== vitals.tempHp) {
            onChange({ tempHp: next });
          }
        }}
      />
    </Box>
  );
}

/**
 * The top of a character's sheet, as on D&D Beyond: who they are with the ways to change that, the numbers a player looks
 * at most (armor class, initiative, speed, proficiency bonus, inspiration) and the hit points, which open a panel to
 * deal damage or heal.
 *
 * @param {object} player as the backend gives it
 * @param {(changes: object) => void} onVitals saves a change to what changes during play
 * @param {() => void} [onEditDetails] opens the details editor
 * @param {() => void} [onEditStats] opens the editor of the sheet's numbers
 * @param {(sheet: object) => void} [onSheet] saves a change to the sheet (the walking speed); without it the speed is only read
 */
export default function SheetHeader({ player, onVitals, onEditDetails, onEditStats, onSheet }) {
  const [anchor, setAnchor] = useState(null);
  const vitals = vitalsOf(player);
  const speed = player.sheet?.speed?.walk;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bolder", overflowWrap: "anywhere" }}>
            {player.name}
          </Typography>
          <Typography color="text.secondary">{describePlayer(player)}</Typography>
        </Box>
        <Chip size="small" label={rulesetLabel(player.ruleset)} />
        {onEditDetails && (
          <Button startIcon={<Edit />} onClick={onEditDetails}>
            Edit details
          </Button>
        )}
        {onEditStats && (
          <Button startIcon={<EditNote />} onClick={onEditStats}>
            Edit stats
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "stretch" }}>
        <Stat label="Armor class" value={player.armorClass} />
        <Stat label="Initiative" value={formatBonus(player.initiativeBonus)} />
        <Stat label="Speed">
          <EditableField label="Walking speed" value={speed === undefined ? "" : String(speed)} hint="Feet" problem={walkProblem} onSave={onSheet && ((text) => onSheet(withWalkingSpeed(player.sheet ?? {}, text)))}>
            <Typography variant="h5" component="p">
              {speed === undefined ? "—" : `${speed} ft.`}
            </Typography>
          </EditableField>
        </Stat>
        <Stat label="Proficiency" value={signed(proficiencyBonus(player.level))} />
        <Stat label="Inspiration">
          <Button
            size="small"
            aria-pressed={vitals.heroicInspiration}
            aria-label="Heroic Inspiration"
            onClick={() => onVitals({ heroicInspiration: !vitals.heroicInspiration })}
            sx={{ minWidth: 0 }}
          >
            {vitals.heroicInspiration ? <Star color="warning" /> : <StarBorder />}
          </Button>
        </Stat>
        <Paper variant="outlined" component="section" aria-label="Hit points" sx={{ p: 1.5, display: "grid", gap: 1, flex: "3 1 260px", alignContent: "center" }}>
          <HpBar player={player} />
          <Box>
            <Button size="small" startIcon={<Favorite />} aria-haspopup="dialog" onClick={(event) => setAnchor(event.currentTarget)}>
              Manage hit points
            </Button>
          </Box>
        </Paper>
      </Box>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <HpManager player={player} onChange={onVitals} />
      </Popover>
    </Box>
  );
}
