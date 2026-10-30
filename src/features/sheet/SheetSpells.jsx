import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import { levelName } from "../spells/spellFormat";
import { RESTS, hasRestables, restWouldHelp, takeRest } from "./sheetRests";
import { adjustmentText } from "./sheetAdjust";
import { SLOT_LEVELS, spellAttackBonus, spellSaveDc, spendHitDie, spendPact, spendSlot, togglePrepared } from "./sheetCasting";
import { ABILITIES, signed } from "./sheetModel";

function Section({ title, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Typography variant="subtitle2" component="h2">
        {title}
      </Typography>
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

/** Spell slots, pact slots and hit dice, as counters. */
export function SheetResources({ sheet, onChange }) {
  const slots = SLOT_LEVELS.filter((level) => sheet.slots?.[level]);
  const dice = sheet.hitDice ?? [];
  if (!slots.length && !sheet.pact && !dice.length) {
    return null;
  }
  return (
    <Section title="Spell slots and hit dice">
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
    </Section>
  );
}

/** The spells, by level, with the casting ability's save DC and attack bonus. Prepared ones can be marked when `onChange` is given. */
export function SheetSpells({ sheet, level, onChange }) {
  const spells = sheet.spells ?? [];
  const dc = spellSaveDc(sheet, level);
  if (!spells.length && dc === null) {
    return null;
  }
  const ability = ABILITIES.find(({ key }) => key === sheet.spellcasting?.ability);
  const levels = [...new Set(spells.map((spell) => spell.level))].sort((a, b) => a - b);
  return (
    <Section title="Spells">
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
    </Section>
  );
}
