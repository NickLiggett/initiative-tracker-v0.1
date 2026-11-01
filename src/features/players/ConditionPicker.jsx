import { useState } from "react";
import { Box, Chip, IconButton, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { CONDITIONS } from "./vitals";

/**
 * A character's conditions. The ones that apply are always shown, and tapping one takes it off; the rest are behind the
 * arrow, which opens the whole list to add from, so a long row of conditions that don't apply isn't in the way.
 *
 * @param {string[]} conditions those that apply now
 * @param {(condition: string) => void} onToggle given a condition to add or take off
 * @param {boolean} [disabled] shows them without letting them be changed
 */
export default function ConditionPicker({ conditions, onToggle, disabled }) {
  const [open, setOpen] = useState(false);
  const chip = (condition, applied) => (
    <Chip
      key={condition}
      size="small"
      label={condition}
      aria-pressed={applied}
      color={applied ? "warning" : "default"}
      variant={applied ? "filled" : "outlined"}
      disabled={disabled}
      onClick={() => onToggle(condition)}
    />
  );
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="subtitle2" component="p">
          Conditions
        </Typography>
        {!disabled && (
          <IconButton
            size="small"
            aria-label={open ? "Hide the other conditions" : "Show the other conditions"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <ExpandMore fontSize="small" sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </IconButton>
        )}
      </Box>
      <Box component="ul" aria-label="Applied conditions" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {conditions.length === 0 && (
          <Typography component="li" variant="body2" color="text.secondary">
            None
          </Typography>
        )}
        {conditions.map((condition) => (
          <li key={condition}>{chip(condition, true)}</li>
        ))}
      </Box>
      {open && (
        <Box component="ul" aria-label="Other conditions" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {CONDITIONS.filter((condition) => !conditions.includes(condition)).map((condition) => (
            <li key={condition}>{chip(condition, false)}</li>
          ))}
        </Box>
      )}
    </Box>
  );
}
