import { Alert, Box, Button, Checkbox, FormControlLabel, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  DEFAULT_NOTE_NAMES,
  DEFAULT_TRACKER_COLUMNS,
  MAX_NOTE_NAME_LENGTH,
  TRACKER_COLUMNS,
  columnLabel,
  sanitizeColumns,
} from "../tracker/columnChoices";
import { sameSetting } from "../../settings/settings";
import { useSettings } from "../../settings/SettingsContext";

const OPTIONS = [
  { value: "down", label: "Count down", example: "20/20 at the start, and damage takes it down" },
  { value: "up", label: "Count up", example: "0/20 at the start, and damage takes it up" },
];

/** How the initiative tracker counts hit points. Changes apply as they're made, to the tracker already running too. */
export default function TrackerSettings() {
  const { settings, saveFailed, update } = useSettings();
  const isDefault = sameSetting(settings.trackerColumns, DEFAULT_TRACKER_COLUMNS) && sameSetting(settings.noteNames, DEFAULT_NOTE_NAMES);

  const toggle = (id, shown) =>
    update({ trackerColumns: shown ? [...settings.trackerColumns, id] : settings.trackerColumns.filter((column) => column !== id) });
  const rename = (index, name) =>
    update({ noteNames: settings.noteNames.map((current, at) => (at === index ? name.slice(0, MAX_NOTE_NAME_LENGTH) : current)) });

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Hit points
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Count up to add the damage as it is dealt, or down to take it off what is left. Typing +5 or -7 in the HP
          column adds or takes away that much of the number shown, either way.
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Count hit points"
          value={settings.hpMode}
          onChange={(event, hpMode) => hpMode !== null && update({ hpMode })}
        >
          {OPTIONS.map(({ value, label }) => (
            <ToggleButton key={value} value={value} sx={{ textTransform: "none" }}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {OPTIONS.find(({ value }) => value === settings.hpMode).example}.
        </Typography>
      </Box>
      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Columns
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Choose what the tracker shows. Initiative and Name are always there. The Edit button is for screens where
          right-click or holding a row isn't handy.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", alignItems: "center" }}>
          {TRACKER_COLUMNS.map((column) => {
            const isDefaultColumn = DEFAULT_TRACKER_COLUMNS.includes(column.id);
            return (
              <Box key={column.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormControlLabel
                  disabled={column.required}
                  control={
                    <Checkbox
                      size="small"
                      checked={settings.trackerColumns.includes(column.id)}
                      onChange={(event) => toggle(column.id, event.target.checked)}
                    />
                  }
                  label={columnLabel(column, settings.noteNames)}
                />
                {isDefaultColumn && !column.required && (
                  <Typography variant="caption" color="text.secondary">
                    default
                  </Typography>
                )}
                {column.note !== undefined && (
                  <TextField
                    size="small"
                    variant="standard"
                    placeholder="Name"
                    inputProps={{ "aria-label": `Name of ${column.label}` }}
                    value={settings.noteNames[column.note]}
                    onChange={(event) => rename(column.note, event.target.value)}
                    sx={{ width: 110 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
        <Button
          size="small"
          sx={{ mt: 1 }}
          disabled={isDefault}
          onClick={() => update({ trackerColumns: sanitizeColumns(null), noteNames: DEFAULT_NOTE_NAMES })}
        >
          Reset to defaults
        </Button>
      </Box>
      {saveFailed && (
        <Alert severity="warning" role="status">
          Couldn't save your changes to your account. They're kept in this browser for now, and are sent again with the next change.
        </Alert>
      )}
    </Box>
  );
}
