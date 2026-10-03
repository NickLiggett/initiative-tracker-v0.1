import { Box, Checkbox, FormControlLabel, Paper, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { capitalizeFirstLetter, labelFromCamelCase } from "../../utils/text";
import { SKILL_ABILITIES } from "./creatureDraft";
import { ABILITY_ORDER, formatModifier } from "./creatureFormat";

const LEVELS = [
  { level: 0, label: "None" },
  { level: 1, label: "Proficient" },
  { level: 2, label: "Expertise" },
];

/**
 * Which saving throws and skills the creature is proficient in. `computed` is the creature the draft makes, to show
 * each resulting bonus; `onChange` is given the changed `saveLevels` and `skillLevels`.
 */
export default function ProficienciesEditor({ draft, computed, onChange }) {
  const setSave = (ability, level) => onChange({ saveLevels: { ...draft.saveLevels, [ability]: level } });
  const setSkill = (skill, level) => onChange({ skillLevels: { ...draft.skillLevels, [skill]: level } });

  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6" component="h3">
        Saving throws and skills
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Bonuses use the ability modifier, plus the proficiency bonus from the challenge rating (
        {formatModifier(computed.proficiencyBonus)}), doubled for expertise.
      </Typography>

      <Box role="group" aria-label="Saving throws" sx={{ display: "grid", gap: 0, gridTemplateColumns: "repeat(3, 1fr)" }}>
        {ABILITY_ORDER.map(([ability]) => (
          <FormControlLabel
            key={ability}
            control={
              <Checkbox
                checked={(draft.saveLevels[ability] ?? 0) > 0}
                onChange={(event) => setSave(ability, event.target.checked ? Math.max(1, draft.saveLevels[ability] ?? 0) : 0)}
              />
            }
            label={<Labelled name={capitalizeFirstLetter(ability)} bonus={computed.savingThrowsAll[ability]} />}
          />
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "1fr auto" }}>
        {Object.entries(SKILL_ABILITIES).map(([skill, ability]) => {
          const name = labelFromCamelCase(skill);
          return (
            <Box key={skill} sx={{ display: "contents" }}>
              <Typography sx={{ alignSelf: "center" }}>
                <Labelled name={name} bonus={computed.skillBonusesAll[skill]} hint={ability.slice(0, 3).toUpperCase()} />
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                aria-label={`${name} proficiency`}
                value={draft.skillLevels[skill] ?? 0}
                onChange={(event, level) => level !== null && setSkill(skill, level)}
              >
                {LEVELS.map(({ level, label }) => (
                  <ToggleButton key={level} value={level} sx={{ textTransform: "none" }}>
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

/** "Stealth (DEX) +8" */
function Labelled({ name, bonus, hint }) {
  return (
    <>
      {name}
      {hint && (
        <Typography component="span" variant="caption" color="text.secondary">
          {` (${hint})`}
        </Typography>
      )}{" "}
      <Typography component="span" color="text.secondary">
        {formatModifier(bonus)}
      </Typography>
    </>
  );
}
