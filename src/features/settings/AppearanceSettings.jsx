import { Alert, Box, Button, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { normalizeHex } from "../../settings/colors";
import { COLOR_PRESETS, MODES } from "../../settings/settings";
import { useSettings } from "../../settings/SettingsContext";
import ColorField from "./ColorField";

/** Light or dark, and the site's two main colors: from a set of themes, or any color. Changes apply as they're made. */
export default function AppearanceSettings() {
  const { settings, saveFailed, update, resetLook } = useSettings();
  const theme = useTheme();
  const background = normalizeHex(theme.palette.background.paper) ?? "#ffffff";
  const activePreset = COLOR_PRESETS.find(
    ({ primary, secondary }) => primary === settings.primary && secondary === settings.secondary,
  );

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Mode
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Mode"
          value={settings.mode}
          onChange={(event, mode) => mode !== null && update({ mode })}
        >
          {MODES.map(({ value, label }) => (
            <ToggleButton key={value} value={value} sx={{ textTransform: "none" }}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Color themes
        </Typography>
        <ToggleButtonGroup
          exclusive
          aria-label="Color themes"
          value={activePreset?.name ?? null}
          onChange={(event, name) => {
            const preset = COLOR_PRESETS.find((candidate) => candidate.name === name);
            if (preset) {
              update({ primary: preset.primary, secondary: preset.secondary });
            }
          }}
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          {COLOR_PRESETS.map(({ name, primary, secondary }) => (
            <ToggleButton key={name} value={name} sx={{ textTransform: "none", gap: 1, borderRadius: 1, border: 1 }}>
              <Swatch color={primary} />
              <Swatch color={secondary} />
              {name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          Your own colors
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          The main color is used for the toolbar and buttons, and the second color for highlights.
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          <ColorField label="Main color" value={settings.primary} background={background} onChange={(primary) => update({ primary })} />
          <ColorField label="Second color" value={settings.secondary} background={background} onChange={(secondary) => update({ secondary })} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="contained">Main button</Button>
        <Button variant="contained" color="secondary">
          Second button
        </Button>
        <Button variant="outlined">Outlined</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={resetLook}>Reset to the defaults</Button>
      </Box>
      {saveFailed ? (
        <Alert severity="warning" role="status">
          Couldn't save your changes to your account. They're kept in this browser for now, and are sent again with the next change.
        </Alert>
      ) : (
        <Alert severity="info" role="note">
          Your colors are saved to your account, so they follow you to other browsers.
        </Alert>
      )}
    </Box>
  );
}

function Swatch({ color }) {
  return <Box component="span" aria-hidden sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: color, border: "1px solid", borderColor: "divider" }} />;
}
