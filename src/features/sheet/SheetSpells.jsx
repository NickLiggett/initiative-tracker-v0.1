import { useState } from "react";
import { Box, Button, Chip, IconButton, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { CheckBox, CheckBoxOutlineBlank, Edit } from "@mui/icons-material";
import { levelName } from "../spells/spellFormat";
import { RESTS, hasRestables, restWouldHelp, takeRest } from "./sheetRests";
import { adjustmentText } from "./sheetAdjust";
import ResourcesDialog from "./ResourcesDialog";
import SpellAdder from "./SpellAdder";
import SpellDialog from "./SpellDialog";
import {
  CASTING_ABILITIES,
  MAX_SPELLS,
  SLOT_LEVELS,
  resourceDraft,
  spellAttackBonus,
  spellDrafts,
  spellSaveDc,
  spendHitDie,
  spendPact,
  spendSlot,
  togglePrepared,
  withResources,
  withSpell,
  withSpellcastingAbility,
  withoutSpell,
} from "./sheetCasting";
import { ABILITIES, signed } from "./sheetModel";

function Section({ title, action, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle2" component="h2" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

/** A row of counters: a filled one is available (tap to spend it), an empty one is spent (tap to take it back). */
function Counters({ label, max, used, onChange }) {
  const left = max - used;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
      <Typography variant="body2" sx={{ minWidth: 90 }}>
        {label}
      </Typography>
      {Array.from({ length: max }, (_, n) => {
        const available = n < left;
        return (
          <Chip
            key={n}
            size="small"
            label={available ? "●" : "○"}
            aria-label={available ? `Spend ${label}` : `Take back ${label}`}
            disabled={!onChange}
            onClick={() => onChange(available ? 1 : -1)}
            sx={{ minWidth: 28 }}
          />
        );
      })}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
        {left} of {max}
      </Typography>
    </Box>
  );
}

/** Short rest and Long rest, each only when it would give something back. Without `onChange` there is nothing to press. */
export function RestBar({ sheet, onChange }) {
  if (!onChange || !hasRestables(sheet)) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
      {RESTS.map(({ key, label }) => (
        <Button key={key} variant="outlined" disabled={!restWouldHelp(sheet, key)} onClick={() => onChange(takeRest(sheet, key))}>
          {label}
        </Button>
      ))}
      <Typography variant="caption" color="text.secondary">
        A short rest gives back what comes back on one and the pact slots; a long rest gives back everything, with half the hit dice.
      </Typography>
    </Box>
  );
}

/** Spell slots, pact slots and hit dice, as counters. With `onChange` their totals can be changed, and the section is shown even when empty. */
export function SheetResources({ sheet, onChange }) {
  const [editing, setEditing] = useState(null);
  const slots = SLOT_LEVELS.filter((level) => sheet.slots?.[level]);
  const dice = sheet.hitDice ?? [];
  const empty = !slots.length && !sheet.pact && !dice.length;
  if (empty && !onChange) {
    return null;
  }
  return (
    <Section
      title="Spell slots and hit dice"
      action={onChange && <Button size="small" startIcon={<Edit />} onClick={() => setEditing(resourceDraft(sheet))}>Edit slots and hit dice</Button>}
    >
      {empty && <Typography color="text.secondary">No spell slots or hit dice yet.</Typography>}
      {slots.map((level) => (
        <Counters key={level} label={`Level ${level} slot`} max={sheet.slots[level].max} used={sheet.slots[level].used} onChange={onChange && ((by) => onChange(spendSlot(sheet, level, by)))} />
      ))}
      {sheet.pact && (
        <Counters label={`Pact slot`} max={sheet.pact.max} used={sheet.pact.used} onChange={onChange && ((by) => onChange(spendPact(sheet, by)))} />
      )}
      {sheet.pact && (
        <Typography variant="caption" color="text.secondary">
          Pact slots are level {sheet.pact.level} and come back on a short rest.
        </Typography>
      )}
      {dice.map((pool, index) => (
        <Counters key={pool.die} label={`${pool.die} hit dice`} max={pool.max} used={pool.used} onChange={onChange && ((by) => onChange(spendHitDie(sheet, index, by)))} />
      ))}
      {editing && (
        <ResourcesDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(draft) => {
            setEditing(null);
            onChange(withResources(sheet, draft));
          }}
        />
      )}
    </Section>
  );
}

/** The spells, by level, with the casting ability's save DC and attack bonus. Prepared ones can be marked when `onChange` is given. */
export function SheetSpells({ sheet, level, onChange }) {
  const [editing, setEditing] = useState(null); // { index, row }
  const spells = sheet.spells ?? [];
  const dc = spellSaveDc(sheet, level);
  if (!spells.length && dc === null && !onChange) {
    return null;
  }
  const ability = ABILITIES.find(({ key }) => key === sheet.spellcasting?.ability);
  const levels = [...new Set(spells.map((spell) => spell.level))].sort((a, b) => a - b);
  return (
    <Section title="Spells">
      {onChange && (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <TextField
            select
            size="small"
            label="Spellcasting ability"
            value={sheet.spellcasting?.ability ?? ""}
            onChange={(event) => onChange(withSpellcastingAbility(sheet, event.target.value))}
            helperText="The save DC and attack bonus are worked out from it."
            sx={{ maxWidth: 280 }}
          >
            <MenuItem value="">Not a spellcaster</MenuItem>
            {CASTING_ABILITIES.map(({ key, label }) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          {spells.length < MAX_SPELLS && <SpellAdder onAdd={(row) => onChange(withSpell(sheet, null, row))} />}
        </Box>
      )}
      {onChange && spells.length === 0 && <Typography color="text.secondary">No spells yet.</Typography>}
      {dc !== null && (
        <Typography variant="body2">
          {ability.label}: spell save DC {dc}, spell attack {signed(spellAttackBonus(sheet, level))}
          {["spell.dc", "spell.attack"].some((key) => adjustmentText(sheet, key)) &&
            ` (${[["DC", "spell.dc"], ["attack", "spell.attack"]].filter(([, key]) => adjustmentText(sheet, key)).map(([name, key]) => `${name}: ${adjustmentText(sheet, key)}`).join(", ")})`}
        </Typography>
      )}
      {levels.map((spellLevel) => (
        <Box key={spellLevel} component="section" aria-label={levelName(spellLevel)} sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {levelName(spellLevel)}
          </Typography>
          {spells.map((spell, index) =>
            spell.level !== spellLevel ? null : (
              <Box key={index} sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                {spellLevel > 0 && (
                  <Box
                    component="button"
                    type="button"
                    aria-label={`${spell.prepared ? "Unprepare" : "Prepare"} ${spell.name}`}
                    aria-pressed={Boolean(spell.prepared)}
                    disabled={!onChange}
                    onClick={() => onChange(togglePrepared(sheet, index))}
                    sx={{ border: 0, background: "none", p: 0, display: "flex", color: "primary.main", cursor: onChange ? "pointer" : "default" }}
                  >
                    {spell.prepared ? <CheckBox fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}
                  </Box>
                )}
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {spell.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[spell.school, spell.castingTime, spell.range, spell.duration, spell.concentration ? "concentration" : null, spell.ritual ? "ritual" : null, spell.source]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
                {onChange && (
                  <IconButton size="small" aria-label={`Edit ${spell.name}`} onClick={() => setEditing({ index, row: spellDrafts({ spells: [spell] }).spells[0] })}>
                    <Edit fontSize="inherit" />
                  </IconButton>
                )}
                {spell.notes && (
                  <Typography variant="caption" sx={{ width: "100%", pl: spellLevel > 0 ? 3.5 : 0 }}>
                    {spell.notes}
                  </Typography>
                )}
              </Box>
            ),
          )}
        </Box>
      ))}
      {editing && (
        <SpellDialog
          initial={editing.row}
          onClose={() => setEditing(null)}
          onSave={(row) => {
            setEditing(null);
            onChange(withSpell(sheet, editing.index, row));
          }}
          onDelete={() => {
            setEditing(null);
            onChange(withoutSpell(sheet, editing.index));
          }}
        />
      )}
    </Section>
  );
}
