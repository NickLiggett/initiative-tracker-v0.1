import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { saveSheet } from "../../api/players";
import { MAX_USES, RESTS } from "./sheetEntries";
import {
  ABILITIES,
  DEFENSE_LISTS,
  PERSONAL_LINES,
  PERSONAL_TEXTS,
  SKILLS,
  TRAINING_LISTS,
  sheetProblems,
  toSheet,
  toSheetDraft,
} from "./sheetModel";

const LEVELS = [
  { value: "none", label: "Not proficient" },
  { value: "proficient", label: "Proficient" },
  { value: "expertise", label: "Expertise" },
];

function Group({ title, hint, children }) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: "grid", gap: 1.5 }}>
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: "bold", mb: 0.5 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/**
 * The form for the rest of a character's sheet: ability scores, which saving throws and skills they are proficient in,
 * speed and senses, defenses, training, and the personal details. Bonuses are worked out for the sheet, not typed. Saving
 * sends the version the character was opened at, so a copy that was out of date is refused.
 *
 * @param {object} player as the backend gives it
 * @param {(player: object) => void} onSaved given the character as it is now
 */
export default function SheetEditor({ player, onSaved, onClose }) {
  // The character as it was when the editor opened: the live refresh may bring in newer ones while the form is being
  // filled in, and the save must say which one it was made from, so that someone else's changes are not silently undone.
  const [opened] = useState(() => ({ version: player.version, sheet: player.sheet }));
  const [draft, setDraft] = useState(() => toSheetDraft(opened.sheet));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const problems = sheetProblems(draft);

  const set = (group, key, value) => setDraft((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  const setRow = (list, index, field, value) =>
    setDraft((current) => ({ ...current, [list]: current[list].map((row, at) => (at === index ? { ...row, [field]: value } : row)) }));
  const addRow = (list, row) => setDraft((current) => ({ ...current, [list]: [...current[list], row] }));
  const removeRow = (list, index) => setDraft((current) => ({ ...current, [list]: current[list].filter((row, at) => at !== index) }));
  const setSave = (key, on) =>
    setDraft((current) => ({ ...current, saves: on ? [...current.saves, key] : current.saves.filter((one) => one !== key) }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveSheet(player.id, { version: opened.version, sheet: toSheet(draft, opened.sheet) }));
    } catch (e) {
      setError(e.message || "Couldn't save.");
      setSaving(false);
    }
  };

  const lines = (group, { key, label }, hint) => (
    <TextField
      key={key}
      label={label}
      multiline
      minRows={2}
      value={draft[group][key]}
      onChange={(event) => set(group, key, event.target.value)}
      helperText={hint}
    />
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="sheet-editor-title">
      <DialogTitle id="sheet-editor-title">{player.name}: sheet</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 3, pt: "8px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        {problems.length > 0 && (
          <Alert severity="warning">
            {problems.map((problem) => (
              <div key={problem}>{problem}</div>
            ))}
          </Alert>
        )}

        <Group title="Ability scores" hint="Modifiers, saving throws, skills and passive scores are worked out from these and the level.">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
            {ABILITIES.map(({ key, label }) => (
              <Box key={key} sx={{ display: "grid", gap: 0.5 }}>
                <TextField label={label} value={draft.abilities[key]} onChange={(event) => set("abilities", key, event.target.value)} />
                <FormControlLabel
                  control={<Checkbox size="small" checked={draft.saves.includes(key)} onChange={(event) => setSave(key, event.target.checked)} />}
                  label={`${label} saving throw`}
                  slotProps={{ typography: { variant: "caption" } }}
                />
              </Box>
            ))}
          </Box>
        </Group>

        <Group title="Skills">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {SKILLS.map(({ key, label, ability }) => (
              <TextField
                key={key}
                select
                size="small"
                label={`${label} (${ability.toUpperCase()})`}
                value={draft.skills[key]}
                onChange={(event) => set("skills", key, event.target.value)}
              >
                {LEVELS.map(({ value, label: text }) => (
                  <MenuItem key={value} value={value}>
                    {text}
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Box>
        </Group>

        <Group title="Speed and senses">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "140px 1fr" }}>
            <TextField label="Walking speed (ft.)" value={draft.speed.walk} onChange={(event) => set("speed", "walk", event.target.value)} />
            <TextField label="Other speeds" value={draft.speed.other} onChange={(event) => set("speed", "other", event.target.value)} helperText="Such as fly 30 ft., swim 30 ft." />
          </Box>
          <TextField
            label="Senses"
            multiline
            minRows={2}
            value={draft.senses}
            onChange={(event) => setDraft((current) => ({ ...current, senses: event.target.value }))}
            helperText="One a line, such as Darkvision 120 ft."
          />
        </Group>

        <Group title="Attacks" hint="Written as on the sheet: +9 to hit, 1d8+5 slashing.">
          {draft.attacks.map((row, index) => (
            <Box key={index} sx={{ display: "grid", gap: 1, gridTemplateColumns: "2fr 1fr 2fr 2fr auto", alignItems: "start" }}>
              {[["name", "Name"], ["bonus", "Hit"], ["damage", "Damage"], ["notes", "Notes"]].map(([field, label]) => (
                <TextField key={field} size="small" label={`${label} of attack ${index + 1}`} value={row[field]} onChange={(event) => setRow("attacks", index, field, event.target.value)} />
              ))}
              <Button color="error" aria-label={`Remove attack ${index + 1}`} onClick={() => removeRow("attacks", index)}>Remove</Button>
            </Box>
          ))}
          <Box>
            <Button onClick={() => addRow("attacks", { name: "", bonus: "", damage: "", notes: "" })}>Add an attack</Button>
          </Box>
        </Group>

        <Group title="Features and traits" hint="Class features, species traits and feats. Give the uses a feature has, and when they come back.">
          {draft.features.map((row, index) => (
            <Box key={index} sx={{ display: "grid", gap: 1, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "2fr 1fr 90px 1fr auto", alignItems: "start" }}>
                <TextField size="small" label={`Name of feature ${index + 1}`} value={row.name} onChange={(event) => setRow("features", index, "name", event.target.value)} />
                <TextField size="small" label={`Source of feature ${index + 1}`} value={row.source} onChange={(event) => setRow("features", index, "source", event.target.value)} />
                <TextField size="small" label={`Uses of feature ${index + 1}`} value={row.max} onChange={(event) => setRow("features", index, "max", event.target.value)} helperText={`1 to ${MAX_USES}`} />
                <TextField select size="small" label={`Comes back on, feature ${index + 1}`} value={row.per} onChange={(event) => setRow("features", index, "per", event.target.value)}>
                  <MenuItem value="">Not limited</MenuItem>
                  {RESTS.map(({ key, label }) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </TextField>
                <Button color="error" aria-label={`Remove feature ${index + 1}`} onClick={() => removeRow("features", index)}>Remove</Button>
              </Box>
              <TextField size="small" multiline minRows={2} label={`Description of feature ${index + 1}`} value={row.description} onChange={(event) => setRow("features", index, "description", event.target.value)} />
            </Box>
          ))}
          <Box>
            <Button onClick={() => addRow("features", { name: "", source: "", description: "", max: "", per: "", used: "0" })}>Add a feature</Button>
          </Box>
        </Group>

        <Group title="Defenses">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {DEFENSE_LISTS.map((list) => lines("defenses", list, "One a line"))}
          </Box>
        </Group>

        <Group title="Proficiencies and training">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {TRAINING_LISTS.map((list) => lines("training", list, "One a line"))}
          </Box>
        </Group>

        <Group title="Personal">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {PERSONAL_LINES.map(({ key, label }) => (
              <TextField key={key} size="small" label={label} value={draft.personal[key]} onChange={(event) => set("personal", key, event.target.value)} />
            ))}
          </Box>
          {PERSONAL_TEXTS.map(({ key, label }) => (
            <TextField key={key} label={label} multiline minRows={2} value={draft.personal[key]} onChange={(event) => set("personal", key, event.target.value)} />
          ))}
        </Group>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving || problems.length > 0} onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
