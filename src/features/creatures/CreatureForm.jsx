import { Autocomplete, Box, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import { capitalizeFirstLetter } from "../../utils/text";
import FormSection from "../../components/resource/FormSection";
import { ActionsEditor, TraitsEditor } from "./AbilitiesEditor";
import { DefensesEditor, SensesEditor } from "./DefensesEditor";
import ProficienciesEditor from "./ProficienciesEditor";
import { ALIGNMENTS, CHALLENGE_RATINGS, SPEED_MODES } from "./creatureDraft";
import { ABILITY_ORDER, abilityModifier, formatChallengeRating, formatModifier } from "./creatureFormat";

/**
 * The fields of a creature draft. `onChange` is given the new draft; `computed` is the creature the draft makes,
 * for the numbers worked out from it. `references` has the backend's sizes, types, damage types and conditions.
 */
export default function CreatureForm({ draft, onChange, computed, references }) {
  const { sizes, types, damageTypes, conditions } = references;
  const set = (changes) => onChange({ ...draft, ...changes });
  const setIn = (group, changes) => set({ [group]: { ...draft[group], ...changes } });
  const suggestedHitDie = sizes.find((size) => size.key === draft.size?.key)?.suggestedHitDice;

  return (
    <Box component="form" aria-label="Creature details" noValidate onSubmit={(event) => event.preventDefault()} sx={{ display: "grid", gap: 2 }}>
      <FormSection title="Basics">
        <TextField label="Creature name" required value={draft.name} onChange={(event) => set({ name: event.target.value })} />
        <Box sx={rowStyles}>
          <ReferenceSelect label="Size" options={sizes} value={draft.size} onChange={(size) => set({ size })} />
          <ReferenceSelect label="Type" options={types} value={draft.type} onChange={(type) => set({ type })} />
        </Box>
        <Box sx={rowStyles}>
          <Autocomplete
            freeSolo
            options={ALIGNMENTS}
            inputValue={draft.alignment}
            onInputChange={(event, alignment) => set({ alignment })}
            renderInput={(params) => <TextField {...params} label="Alignment" />}
          />
          <TextField
            select
            label="Challenge rating"
            value={draft.challengeRating}
            onChange={(event) => set({ challengeRating: Number(event.target.value) })}
          >
            {CHALLENGE_RATINGS.map((rating) => (
              <MenuItem key={rating} value={rating}>
                {formatChallengeRating(rating)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField label="Languages" value={draft.languages} onChange={(event) => set({ languages: event.target.value })} />
      </FormSection>

      <FormSection title="Combat">
        <Box sx={rowStyles}>
          <NumberField label="Armor class" value={draft.armorClass} onChange={(armorClass) => set({ armorClass })} />
          <TextField
            label="Armor type"
            value={draft.armorDetail}
            onChange={(event) => set({ armorDetail: event.target.value })}
          />
        </Box>
        <Box sx={rowStyles}>
          <NumberField label="Hit points" value={draft.hitPoints} onChange={(hitPoints) => set({ hitPoints })} />
          <TextField
            label="Hit dice"
            value={draft.hitDice}
            onChange={(event) => set({ hitDice: event.target.value })}
            helperText={suggestedHitDie ? `A ${draft.size.name} creature usually has ${suggestedHitDie}s` : undefined}
          />
        </Box>
        <Typography variant="subtitle2">Speed (feet)</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(3, 1fr)" }}>
          {SPEED_MODES.map((mode) => (
            <NumberField
              key={mode}
              label={capitalizeFirstLetter(mode)}
              value={draft.speed[mode]}
              onChange={(feet) => setIn("speed", { [mode]: feet })}
            />
          ))}
        </Box>
        <FormControlLabel
          label="Can hover"
          control={<Checkbox checked={draft.speed.hover} onChange={(event) => setIn("speed", { hover: event.target.checked })} />}
        />
      </FormSection>

      <FormSection title="Ability scores">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(3, 1fr)" }}>
          {ABILITY_ORDER.map(([ability]) => {
            const score = draft.abilityScores[ability];
            return (
              <NumberField
                key={ability}
                label={capitalizeFirstLetter(ability)}
                value={score}
                onChange={(value) => setIn("abilityScores", { [ability]: value })}
                helperText={score === "" ? undefined : `Modifier ${formatModifier(abilityModifier(score))}`}
              />
            );
          })}
        </Box>
      </FormSection>

      <ProficienciesEditor draft={draft} computed={computed} onChange={set} />
      <SensesEditor
        senses={draft.senses}
        passivePerception={computed.passivePerception}
        onChange={(senses) => set({ senses })}
      />
      <DefensesEditor
        defenses={draft.defenses}
        damageTypes={damageTypes}
        conditions={conditions}
        onChange={(defenses) => set({ defenses })}
      />

      <TraitsEditor traits={draft.traits} onChange={(traits) => set({ traits })} />
      <ActionsEditor actions={draft.actions} onChange={(actions) => set({ actions })} />
    </Box>
  );
}

const rowStyles = { display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" };

/** A whole number; anything else typed is dropped. */
function NumberField({ label, value, onChange, helperText }) {
  return (
    <TextField
      label={label}
      value={value}
      helperText={helperText}
      onChange={(event) => onChange(event.target.value.replace(/[^\d-]/g, ""))}
      inputProps={{ inputMode: "numeric" }}
    />
  );
}

/** Picks one of `{key, name}` options; the value is the option itself. */
function ReferenceSelect({ label, options, value, onChange }) {
  return (
    <TextField
      select
      InputLabelProps={{ shrink: true }} // "None" is an empty value, which would leave the label over it
      label={label}
      value={value?.key ?? ""}
      onChange={(event) => {
        const option = options.find((candidate) => candidate.key === event.target.value);
        onChange(option ? { key: option.key, name: option.name } : null);
      }}
    >
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.key} value={option.key}>
          {option.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
