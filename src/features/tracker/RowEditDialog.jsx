import { useState } from "react";
import {
  Box,
  Button,
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
import { MAX_NOTE_LENGTH, NOTE_FIELDS } from "./columnChoices";
import { legendaryActionsPerRound, legendaryResistancesPerDay } from "../creatures/creatureFormat";
import { COMBATANT_TYPES } from "./CombatantForm";
import { fieldShown, isCharacter } from "./combatants";
import PlayerPicker from "./PlayerPicker";
import { playerCombatant } from "./playerCombatants";

const MAX_NAME_LENGTH = 40;
const MAX_DIGITS = { initiative: 2, ac: 2, hp: 4, maxHp: 4, tempHp: 4, legendaryActions: 1, legendaryResistances: 1 };

const asText = (value) => (value === undefined || value === null ? "" : String(value));
/** A number from what was typed, "" when nothing was. */
const asNumber = (text) => (text === "" ? "" : parseInt(text, 10));

/** The form's fields for a combatant, as text. */
function toDraft(combatant) {
  return {
    name: combatant.name,
    type: combatant.type ?? "",
    initiative: asText(combatant.initiative),
    ac: asText(combatant.ac),
    hp: asText(combatant.hp),
    maxHp: asText(combatant.maxHp),
    tempHp: asText(combatant.tempHp),
    ...Object.fromEntries(NOTE_FIELDS.map((field) => [field, combatant[field] ?? ""])),
    legendaryActions: asText(combatant.legendaryActions),
    legendaryResistances: asText(combatant.legendaryResistances),
    nameShown: fieldShown(combatant, "name"),
    acShown: fieldShown(combatant, "ac"),
    hpShown: fieldShown(combatant, "hp"),
    creature: combatant.creature ?? null,
    playerId: combatant.playerId ?? null,
  };
}

/** What to change on the combatant for a draft that has been checked. */
function toChanges(draft) {
  return {
    name: draft.name.trim(),
    type: draft.type,
    initiative: parseInt(draft.initiative, 10),
    ac: asNumber(draft.ac),
    hp: asNumber(draft.hp),
    maxHp: draft.maxHp === "" ? undefined : parseInt(draft.maxHp, 10),
    tempHp: draft.tempHp === "" ? undefined : parseInt(draft.tempHp, 10),
    ...Object.fromEntries(NOTE_FIELDS.map((field) => [field, draft[field] === "" ? undefined : draft[field]])),
    legendaryActions: draft.legendaryActions === "" ? undefined : parseInt(draft.legendaryActions, 10),
    legendaryResistances: draft.legendaryResistances === "" ? undefined : parseInt(draft.legendaryResistances, 10),
    ...(isCharacter(draft) ? {} : { nameHidden: !draft.nameShown, acRevealed: draft.acShown, hpRevealed: draft.hpShown }),
    creature: draft.creature,
    playerId: draft.playerId ?? undefined,
  };
}

/**
 * Change anything about a row of the initiative order: its name, type, numbers, the legendary actions and resistances it
 * has, whether the players see its AC and HP, or give it a character's stats to make it that character (it keeps its
 * initiative). Nothing changes until Save.
 * @param {object} combatant the row being changed
 * @param {{field: string, label: string}[]} noteFields the Notes columns being shown, to write in here too
 * @param {Set<number>} inFight the ids of the characters in the order, so one can't be in it twice
 * @param {(changes: object) => void} onSave
 * @param {() => void} onClose
 */
export default function RowEditDialog({ combatant, noteFields = [], inFight, onSave, onClose }) {
  const [draft, setDraft] = useState(() => toDraft(combatant));
  const [choosing, setChoosing] = useState(false);
  const [tried, setTried] = useState(false);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const digits = (field) => (event) => {
    const input = event.target.value;
    if (input === "" || (/^\d+$/.test(input) && input.length <= MAX_DIGITS[field])) {
      change({ [field]: input });
    }
  };

  const nameMissing = draft.name.trim() === "";
  const initiativeMissing = draft.initiative === "";

  /** Becomes this character: its stats replace the row's, but the initiative stays. */
  const assign = (player) => {
    const stats = toDraft(playerCombatant(player, draft.initiative));
    const kept = ["tempHp", ...NOTE_FIELDS]; // the row's own temporary hit points and notes stay
    change(Object.fromEntries(Object.entries(stats).filter(([field]) => !kept.includes(field))));
    setChoosing(false);
  };

  const save = () => {
    setTried(true);
    if (nameMissing || initiativeMissing) {
      return;
    }
    onSave(toChanges(draft));
  };

  const creatureNote = (count, own) => (draft.creature ? `Blank is the creature's own (${own})` : count);
  const character = isCharacter(draft);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="row-edit-title">
      <DialogTitle id="row-edit-title">Edit {combatant.name}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={draft.name}
            error={tried && nameMissing}
            onChange={(event) => change({ name: event.target.value.slice(0, MAX_NAME_LENGTH) })}
          />
          <TextField select label="Type" size="small" sx={{ minWidth: 140 }} value={draft.type} onChange={(event) => change({ type: event.target.value })}>
            {(COMBATANT_TYPES.includes(draft.type) ? COMBATANT_TYPES : [draft.type, ...COMBATANT_TYPES]).map((type) => (
              <MenuItem key={type} value={type}>
                {type || "None"}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Initiative"
            size="small"
            inputProps={{ inputMode: "numeric" }}
            value={draft.initiative}
            error={tried && initiativeMissing}
            onChange={digits("initiative")}
          />
          <TextField label="AC" size="small" inputProps={{ inputMode: "numeric" }} value={draft.ac} onChange={digits("ac")} />
          <TextField label="HP" size="small" inputProps={{ inputMode: "numeric" }} value={draft.hp} onChange={digits("hp")} helperText="Hit points left" />
          <TextField label="Max HP" size="small" inputProps={{ inputMode: "numeric" }} value={draft.maxHp} onChange={digits("maxHp")} />
          <TextField label="Temp HP" size="small" inputProps={{ inputMode: "numeric" }} value={draft.tempHp} onChange={digits("tempHp")} />
        </Box>

        {noteFields.map(({ field, label }) => (
          <TextField
            key={field}
            label={label}
            size="small"
            fullWidth
            multiline
            value={draft[field]}
            onChange={(event) => change({ [field]: event.target.value.slice(0, MAX_NOTE_LENGTH) })}
          />
        ))}

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Legendary actions"
            size="small"
            fullWidth
            inputProps={{ inputMode: "numeric" }}
            value={draft.legendaryActions}
            onChange={digits("legendaryActions")}
            helperText={creatureNote("Per round; blank for none", legendaryActionsPerRound(draft.creature))}
          />
          <TextField
            label="Legendary resistances"
            size="small"
            fullWidth
            inputProps={{ inputMode: "numeric" }}
            value={draft.legendaryResistances}
            onChange={digits("legendaryResistances")}
            helperText={creatureNote("Per day; blank for none", legendaryResistancesPerDay(draft.creature))}
          />
        </Box>

        {!character && (
          <Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              {[
                ["nameShown", "name"],
                ["acShown", "AC"],
                ["hpShown", "HP"],
              ].map(([field, what]) => (
                <FormControlLabel
                  key={field}
                  control={<Switch checked={draft[field]} onChange={(event) => change({ [field]: event.target.checked })} />}
                  label={`Players see its ${what}`}
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="outlined" onClick={() => setChoosing(true)}>
            Make it a character…
          </Button>
          <Typography variant="body2" color="text.secondary">
            Takes a character's name, AC and HP; keeps this row's initiative.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>
          Save
        </Button>
      </DialogActions>
      <PlayerPicker
        open={choosing}
        inFight={new Set([...inFight].filter((id) => id !== combatant.playerId))}
        onChoose={assign}
        onClose={() => setChoosing(false)}
      />
    </Dialog>
  );
}
