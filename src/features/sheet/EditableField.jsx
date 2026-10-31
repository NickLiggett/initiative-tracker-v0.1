import { useState } from "react";
import { Box, Button, IconButton, Popover, TextField } from "@mui/material";
import { Edit } from "@mui/icons-material";

/** The text box that opens from a pencil, with the current text, a Save and a Cancel. */
function EditPanel({ label, value, multiline, hint, problem, onSave, onClose }) {
  const [text, setText] = useState(value);
  const error = problem?.(text) ?? null;
  const save = () => !error && onSave(text);

  return (
    <Box sx={{ p: 2, display: "grid", gap: 1, width: multiline ? 360 : 260 }}>
      <TextField
        size="small"
        autoFocus
        label={label}
        value={text}
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && !multiline && save()}
        error={Boolean(error)}
        helperText={error ?? hint}
      />
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={Boolean(error)} onClick={save}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Something on the sheet with a pencil beside it that opens a small box to change it in place. Without `onSave` (a DM looking
 * at a party member's sheet) it is only the thing itself.
 *
 * @param {string} label what is changed, such as "Resistances"; names the pencil and the box
 * @param {string} value the text the box starts with
 * @param {(text: string) => void} [onSave] given the new text once Save is pressed
 * @param {boolean} [multiline] a box of several lines, for lists and long texts
 * @param {string} [hint] a line of help under the box
 * @param {(text: string) => ?string} [problem] a sentence when the text can't be saved
 * @param children the thing as it is shown
 */
export default function EditableField({ label, value, onSave, multiline = false, hint, problem, children }) {
  const [anchor, setAnchor] = useState(null);
  if (!onSave) {
    return <>{children}</>;
  }
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <IconButton size="small" aria-label={`Edit ${label}`} onClick={(event) => setAnchor(event.currentTarget)}>
        <Edit fontSize="inherit" />
      </IconButton>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <EditPanel
          label={label}
          value={value}
          multiline={multiline}
          hint={hint}
          problem={problem}
          onClose={() => setAnchor(null)}
          onSave={(text) => {
            setAnchor(null);
            onSave(text);
          }}
        />
      </Popover>
    </Box>
  );
}
