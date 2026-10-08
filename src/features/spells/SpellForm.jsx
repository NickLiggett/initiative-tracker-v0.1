import { Autocomplete, Box, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import FormSection from "../../components/resource/FormSection";
import { capitalizeFirstLetter } from "../../utils/text";
import { ABILITIES, CASTING_TIMES, DURATIONS, SHAPES, TARGET_TYPES } from "./spellDraft";
import { castingTimeText, levelName } from "./spellFormat";

/** A native choice, with the label kept clear of a value that is empty ("None"). */
function Choice({ label, value, onChange, options, none }) {
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }}
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {none !== undefined && <option value="">{none}</option>}
      {options.map(({ value: optionValue, label: optionLabel }) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </TextField>
  );
}

const check = (label, checked, onChange) => (
  <FormControlLabel control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />} label={label} />
);

/**
 * The fields of a spell, in sections. `references` are the lists to choose from: `schools`, `classes` and `damageTypes`.
 * @param {object} draft see spellDraft.js
 * @param {(draft: object) => void} onChange
 */
export default function SpellForm({ draft, onChange, references }) {
  const set = (changes) => onChange({ ...draft, ...changes });
  const input = (field) => (event) => set({ [field]: event.target.value });
  const unit = draft.base?.rangeUnit === "ft" ? "feet" : (draft.base?.rangeUnit ?? "feet");

  // A casting time, or a school's key, from a spell that has one we don't list, is still offered.
  const castingTimes = CASTING_TIMES.includes(draft.castingTime) || !draft.castingTime ? CASTING_TIMES : [draft.castingTime, ...CASTING_TIMES];
  const schoolOptions = references.schools.some((school) => school.key === draft.school?.key) || !draft.school ? references.schools : [draft.school, ...references.schools];

  return (
    <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
      <FormSection title="The spell">
        <TextField size="small" label="Spell name" value={draft.name} onChange={input("name")} />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
          <Choice
            label="Level"
            value={draft.level}
            onChange={(level) => set({ level })}
            options={Array.from({ length: 10 }, (_, level) => ({ value: String(level), label: level === 0 ? "Cantrip" : levelName(level) }))}
          />
          <Choice
            label="School"
            value={draft.school?.key ?? ""}
            onChange={(key) => set({ school: schoolOptions.find((school) => school.key === key) ?? null })}
            options={schoolOptions.map(({ key, name }) => ({ value: key, label: name }))}
            none="Choose…"
          />
        </Box>
        <Autocomplete
          multiple
          size="small"
          options={references.classes}
          value={draft.classes}
          getOptionLabel={(one) => (one.document?.displayName ? `${one.name} (${one.document.displayName})` : one.name)}
          isOptionEqualToValue={(a, b) => a.key === b.key}
          onChange={(event, classes) => set({ classes: classes.map(({ key, name }) => ({ key, name })) })}
          renderInput={(params) => <TextField {...params} label="Classes" helperText="Whose spell lists it is on." />}
        />
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {check("Ritual", draft.ritual, (ritual) => set({ ritual }))}
          {check("Concentration", draft.concentration, (concentration) => set({ concentration }))}
        </Box>
      </FormSection>

      <FormSection title="Casting">
        <Choice
          label="Casting time"
          value={draft.castingTime}
          onChange={(castingTime) => set({ castingTime })}
          options={castingTimes.map((code) => ({ value: code, label: castingTimeText(code) }))}
        />
        {draft.castingTime === "reaction" && (
          <TextField
            size="small"
            label="Reaction condition"
            value={draft.reactionCondition}
            onChange={input("reactionCondition")}
            helperText="What it is taken in response to, e.g. when you are hit by an attack."
          />
        )}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "2fr 1fr" }}>
          <TextField size="small" label="Range" value={draft.rangeText} onChange={input("rangeText")} helperText="In words: Self, Touch, 60 feet." />
          <TextField
            size="small"
            label="Range distance"
            value={draft.rangeDistance}
            onChange={input("rangeDistance")}
            inputProps={{ inputMode: "numeric" }}
            helperText={`In ${unit}; empty for Self or Touch.`}
          />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Components
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {check("Verbal", draft.verbal, (verbal) => set({ verbal }))}
            {check("Somatic", draft.somatic, (somatic) => set({ somatic }))}
            {check("Material", draft.material, (material) => set({ material }))}
          </Box>
        </Box>
        {draft.material && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField size="small" label="Materials" value={draft.materialSpecified} onChange={input("materialSpecified")} helperText="What the spell needs, e.g. a pinch of sulfur." />
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField size="small" label="Material cost (gp)" value={draft.materialCost} onChange={input("materialCost")} inputProps={{ inputMode: "decimal" }} />
              {check("Consumed", draft.materialConsumed, (materialConsumed) => set({ materialConsumed }))}
            </Box>
          </Box>
        )}
        <Autocomplete
          freeSolo
          size="small"
          options={DURATIONS}
          inputValue={draft.duration}
          onInputChange={(event, duration) => duration !== draft.duration && set({ duration })}
          renderInput={(params) => <TextField {...params} label="Duration" helperText="Pick one, or write your own." />}
        />
      </FormSection>

      <FormSection title="Effect">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
          <Choice
            label="Target"
            value={draft.targetType}
            onChange={(targetType) => set({ targetType })}
            options={TARGET_TYPES.map((type) => ({ value: type, label: capitalizeFirstLetter(type) }))}
            none="None"
          />
          <TextField size="small" label="Number of targets" value={draft.targetCount} onChange={input("targetCount")} inputProps={{ inputMode: "numeric" }} />
        </Box>
        <Choice
          label="Saving throw"
          value={draft.savingThrowAbility}
          onChange={(savingThrowAbility) => set({ savingThrowAbility })}
          options={ABILITIES.map((ability) => ({ value: ability, label: capitalizeFirstLetter(ability) }))}
          none="None"
        />
        {check("Spell attack roll", draft.attackRoll, (attackRoll) => set({ attackRoll }))}
        <TextField size="small" label="Damage roll" value={draft.damageRoll} onChange={input("damageRoll")} helperText="Dice, e.g. 8d6." />
        <Autocomplete
          multiple
          size="small"
          options={references.damageTypes.map((type) => type.key)}
          value={draft.damageTypes}
          getOptionLabel={(key) => references.damageTypes.find((type) => type.key === key)?.name ?? capitalizeFirstLetter(key)}
          onChange={(event, damageTypes) => set({ damageTypes })}
          renderInput={(params) => <TextField {...params} label="Damage types" />}
        />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
          <Choice
            label="Area shape"
            value={draft.shapeType}
            onChange={(shapeType) => set({ shapeType })}
            options={SHAPES.map((shape) => ({ value: shape, label: capitalizeFirstLetter(shape) }))}
            none="None"
          />
          <TextField
            size="small"
            label="Area size"
            value={draft.shapeSize}
            onChange={input("shapeSize")}
            disabled={!draft.shapeType}
            inputProps={{ inputMode: "numeric" }}
            helperText="Radius, side or length, in feet."
          />
        </Box>
      </FormSection>

      <FormSection title="Description">
        <TextField size="small" label="Description" multiline minRows={5} value={draft.desc} onChange={input("desc")} helperText="**bold**, *italic*, and “- ” lists work." />
        <TextField size="small" label="At higher levels" multiline minRows={2} value={draft.higherLevel} onChange={input("higherLevel")} />
      </FormSection>
    </Box>
  );
}
