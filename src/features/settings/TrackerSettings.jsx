import { Alert, Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useSettings } from "../../settings/SettingsContext";

const OPTIONS = [
  { value: "down", label: "Count down", example: "20/20 at the start, and damage takes it down" },
  { value: "up", label: "Count up", example: "0/20 at the start, and damage takes it up" },
];

/** How the initiative tracker counts hit points. Changes apply as they're made, to the tracker already running too. */
export default function TrackerSettings() {
  const { settings, saveFailed, update } = useSettings();

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
      {saveFailed && (
        <Alert severity="warning" role="status">
          Couldn't save your changes to your account. They're kept in this browser for now, and are sent again with the next change.
        </Alert>
      )}
    </Box>
  );
}
