import { Alert, Box, Button, Typography } from "@mui/material";

/**
 * The frame of an editor: a title with Cancel and Save, what's stopping a save, any error, and the form beside a
 * live preview.
 * @param {string} title e.g. "New creature"
 * @param {string} [basedOn] the key of what this was copied from, if anything
 * @param {string[]} problems what must be fixed before saving; Save is off while there are any
 * @param {?string} error a message from a failed load or save
 */
export default function EditorShell({ title, basedOn, problems, error, saving, onSave, onCancel, form, preview }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
          {problems.length > 0 && (
            <Typography variant="body2" color="text.secondary" role="status">
              {problems.join(" ")}
            </Typography>
          )}
          {basedOn && (
            <Typography variant="caption" color="text.secondary">
              Based on {basedOn}
            </Typography>
          )}
        </Box>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving || problems.length > 0}>
          Save
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        {form}
        <Box sx={{ position: { lg: "sticky" }, top: 16, alignSelf: "start" }} aria-label="Preview">
          <Typography variant="overline" color="text.secondary">
            Preview
          </Typography>
          {preview}
        </Box>
      </Box>
    </Box>
  );
}
