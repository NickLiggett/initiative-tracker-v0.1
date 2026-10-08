import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import Description from "../../components/Description";
import { Section, SourceChip, StatTile } from "../../components/resource/StatBlockParts";
import {
  castingOptionName,
  castingTimeWithCondition,
  componentsText,
  damageText,
  durationText,
  hasDetails,
  rangeText,
  saveText,
  shapeText,
  spellKind,
  targetText,
} from "./spellFormat";

const tilesStyles = { display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", mb: 2 };

/** Everything the backend knows about a spell, laid out like a spell card. */
export default function SpellStatBlock({ spell }) {
  const effects = [
    ["Target", targetText(spell)],
    ["Area", shapeText(spell)],
    ["Saving throw", saveText(spell)],
    ["Attack", spell.attackRoll ? "Spell attack roll" : ""],
    ["Damage", damageText(spell)],
  ].filter(([, value]) => value);
  const options = (spell.castingOptions ?? []).filter(hasDetails);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {spell.name}
        </Typography>
        <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
          {spellKind(spell)}
        </Typography>
        {(spell.classes ?? []).length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }} aria-label="Classes">
            {spell.classes.map((one) => (
              <Chip key={one.key} size="small" variant="outlined" label={one.name} />
            ))}
          </Box>
        )}
        <SourceChip document={spell.document} />
      </Box>

      <Box sx={tilesStyles}>
        <StatTile label="Casting time">{castingTimeWithCondition(spell) || "—"}</StatTile>
        <StatTile label="Range">{rangeText(spell) || "—"}</StatTile>
        <StatTile label="Components">{componentsText(spell) || "None"}</StatTile>
        <StatTile label="Duration">{durationText(spell) || "—"}</StatTile>
      </Box>

      {effects.length > 0 && (
        <Box sx={tilesStyles}>
          {effects.map(([label, value]) => (
            <StatTile key={label} label={label}>
              {value}
            </StatTile>
          ))}
        </Box>
      )}

      {spell.desc?.trim() && (
        <Section title="Description">
          <Description text={spell.desc} />
        </Section>
      )}

      {spell.higherLevel?.trim() && (
        <Section title="At higher levels">
          <Description text={spell.higherLevel} />
        </Section>
      )}

      {options.length > 0 && (
        <Section title="How it scales">
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ width: "auto", minWidth: 280 }}>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Damage</TableCell>
                  <TableCell>Targets</TableCell>
                  <TableCell>Other</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {options.map((option) => (
                  <TableRow key={option.type}>
                    <TableCell>{castingOptionName(option.type)}</TableCell>
                    <TableCell>{option.damageRoll || "—"}</TableCell>
                    <TableCell>{option.targetCount || "—"}</TableCell>
                    <TableCell>{[option.duration, option.range && `range ${option.range}`, option.shapeSize && `size ${option.shapeSize}`, option.desc].filter(Boolean).join("; ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Section>
      )}
    </Box>
  );
}
