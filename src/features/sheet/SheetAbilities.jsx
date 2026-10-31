import { useState } from "react";
import { Box, Button, Paper, Popover, TextField, Typography } from "@mui/material";
import { ABILITIES, MAX_SCORE, MIN_SCORE, abilityModifier, proficiencyBonus, signed } from "./sheetModel";

/** Changes the score of one ability, in the panel that opens from its tile. */
function ScoreEditor({ label, score, onSave }) {
  const [text, setText] = useState(score === undefined ? "" : String(score));
  const value = /^\d+$/.test(text.trim()) ? parseInt(text, 10) : NaN;
  const valid = value >= MIN_SCORE && value <= MAX_SCORE;

  return (
    <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "flex-start" }}>
      <TextField
        size="small"
        autoFocus
        label={`${label} score`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && valid && onSave(value)}
        error={text.trim() !== "" && !valid}
        helperText={`${MIN_SCORE} to ${MAX_SCORE}`}
        inputProps={{ inputMode: "numeric" }}
        sx={{ width: 150 }}
      />
      <Button variant="contained" disabled={!valid} onClick={() => onSave(value)} sx={{ mt: 0.25 }}>
        Set
      </Button>
    </Box>
  );
}

/**
 * The six ability scores as D&D Beyond shows them: the modifier large, the score in a badge beneath. With `onChange`, a
 * tile opens a small panel to set its score.
 *
 * @param {object} sheet the character's `sheet`
 * @param {number} level the character's level, for the proficiency bonus
 * @param {(sheet: object) => void} [onChange] given the sheet with a score changed, to save
 */
export default function SheetAbilities({ sheet, level, onChange }) {
  const [open, setOpen] = useState(null); // { key, label, anchor }
  const filled = ABILITIES.some(({ key }) => abilityModifier(sheet, key) !== null);
  if (!filled && !onChange) {
    return null;
  }

  return (
    <Box component="section" aria-label="Abilities" sx={{ display: "grid", gap: 0.5 }}>
      <Box component="ul" aria-label="Ability scores" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
        {ABILITIES.map(({ key, label }) => {
          const score = sheet.abilities?.[key];
          const tile = (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5, display: "block" }}>
                {label}
              </Typography>
              <Typography variant="h4" component="p">
                {score === undefined ? "—" : signed(abilityModifier(sheet, key))}
              </Typography>
              <Box sx={{ mx: "auto", mt: 0.5, width: 40, height: 24, lineHeight: "24px", borderRadius: 3, border: 1, borderColor: "divider", fontSize: "0.9rem", bgcolor: "background.paper" }}>
                {score ?? "—"}
              </Box>
            </>
          );
          return (
            <Paper component="li" variant="outlined" key={key} aria-label={label} sx={{ textAlign: "center", overflow: "hidden" }}>
              {onChange ? (
                <Box
                  component="button"
                  type="button"
                  aria-label={`${label} ${score === undefined ? "not set" : `${score}, modifier ${signed(abilityModifier(sheet, key))}`}. Change`}
                  onClick={(event) => setOpen({ key, label, anchor: event.currentTarget })}
                  sx={{ all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box", p: 1, "&:hover, &:focus-visible": { bgcolor: "action.hover" } }}
                >
                  {tile}
                </Box>
              ) : (
                <Box sx={{ p: 1 }}>{tile}</Box>
              )}
            </Paper>
          );
        })}
      </Box>
      <Typography variant="body2" color="text.secondary">
        Proficiency bonus {signed(proficiencyBonus(level))}
      </Typography>
      <Popover open={Boolean(open)} anchorEl={open?.anchor} onClose={() => setOpen(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} transformOrigin={{ vertical: "top", horizontal: "center" }}>
        {open && (
          <ScoreEditor
            key={open.key}
            label={open.label}
            score={sheet.abilities?.[open.key]}
            onSave={(value) => {
              onChange({ ...sheet, abilities: { ...sheet.abilities, [open.key]: value } });
              setOpen(null);
            }}
          />
        )}
      </Popover>
    </Box>
  );
}
