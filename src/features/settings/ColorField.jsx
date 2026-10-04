import { useEffect, useState } from "react";
import { Box, TextField } from "@mui/material";
import { contrastRatio, normalizeHex } from "../../settings/colors";

/** The least contrast a color needs against the page to be easy to see (WCAG, for things that aren't text). */
const MIN_CONTRAST = 3;

/**
 * A color to pick, with a color chooser and a box to type its hex code (like #1976d2) in. It changes the color as
 * soon as a full code is typed, and warns when the color would be hard to see against the page.
 * @param {string} value "#rrggbb"
 * @param {string} background the page color the value will be seen against, "#rrggbb"
 * @param {(hex: string) => void} onChange gets "#rrggbb"
 */
export default function ColorField({ label, value, background, onChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const invalid = text.trim() !== "" && normalizeHex(text) === null;
  const hardToSee = contrastRatio(value, background) < MIN_CONTRAST;

  const type = (typed) => {
    setText(typed);
    // Only a whole code counts while typing: "#197" is a short code for a color, but just a step towards "#1976d2".
    if (/^#?[0-9a-f]{6}$/i.test(typed.trim())) {
      onChange(normalizeHex(typed));
    }
  };

  const finish = () => {
    const hex = normalizeHex(text);
    if (hex) {
      onChange(hex); // short codes count once typing has stopped
    }
    setText(hex ?? value);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box
        component="input"
        type="color"
        aria-label={`${label} chooser`}
        value={value}
        onChange={(event) => onChange(normalizeHex(event.target.value))}
        sx={{ width: 48, height: 40, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "transparent", cursor: "pointer" }}
      />
      <TextField
        size="small"
        label={label}
        value={text}
        onChange={(event) => type(event.target.value)}
        onBlur={finish}
        error={invalid}
        helperText={invalid ? "Use a color code like #1976d2." : hardToSee ? "This color is hard to see against the page." : " "}
        sx={{ width: 220 }}
      />
    </Box>
  );
}
