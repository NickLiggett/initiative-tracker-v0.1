import { Box, Button, Checkbox, FormControlLabel, FormGroup, TextField, Typography } from "@mui/material";
import FormSection from "../../components/resource/FormSection";
import { ABILITY_REFS, CASTER_TYPES, HIT_DICE, MAX_LEVEL } from "./classDraft";

/** A tick box; `group` tells screen readers (and tests) which list of abilities it is in. */
const check = (label, checked, onChange, group) => (
  <FormControlLabel
    key={label}
    control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} inputProps={group ? { "aria-label": `${label} ${group}` } : undefined} />}
    label={label}
  />
);

/**
 * The fields of a class or subclass, in sections. `classes` are the base classes a subclass can belong to.
 * @param {object} draft see classDraft.js
 * @param {(draft: object) => void} onChange
 * @param {{key: string, name: string}[]} classes
 */
export default function ClassForm({ draft, onChange, classes }) {
  const set = (changes) => onChange({ ...draft, ...changes });
  const input = (field) => (event) => set({ [field]: event.target.value });
  const subclass = Boolean(draft.subclassOfKey);
  const toggle = (field, key) => (on) => set({ [field]: on ? [...draft[field], key] : draft[field].filter((one) => one !== key) });
  const setRow = (list, index, changes) => set({ [list]: draft[list].map((row, at) => (at === index ? { ...row, ...changes } : row)) });
  const removeRow = (list, index) => set({ [list]: draft[list].filter((row, at) => at !== index) });

  return (
    <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
      <FormSection title="Basics">
        <TextField label="Name" value={draft.name} onChange={input("name")} />
        <TextField
          select
          size="small"
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
          label="Subclass of"
          value={draft.subclassOfKey}
          onChange={(event) => set({ subclassOfKey: event.target.value, subclassOfName: classes.find((one) => one.key === event.target.value)?.name ?? "" })}
          helperText="Leave empty for a class of its own."
        >
          <option value="">Not a subclass</option>
          {classes.map(({ key, name }) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </TextField>
        <TextField label="Description" multiline minRows={3} value={draft.desc} onChange={input("desc")} />
      </FormSection>

      {!subclass && (
        <FormSection title="Hit points, proficiencies and spellcasting">
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
            <TextField select size="small" SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Hit die" value={draft.hitDie} onChange={input("hitDie")}>
              {HIT_DICE.map((die) => (
                <option key={die} value={die}>
                  {die.toLowerCase()}
                </option>
              ))}
            </TextField>
            <TextField select size="small" SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Spellcasting" value={draft.casterType} onChange={input("casterType")}>
              {CASTER_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </TextField>
          </Box>
          <TextField label="Hit points at 1st level" value={draft.hpFirst} onChange={input("hpFirst")} placeholder="10 + your Constitution modifier" />
          <TextField label="Hit points at higher levels" value={draft.hpHigher} onChange={input("hpHigher")} placeholder="1d10 (or 6) + your Constitution modifier per level after 1st" />
          <Box>
            <Typography variant="subtitle2">Saving throws</Typography>
            <FormGroup row>{ABILITY_REFS.map(({ key, name }) => check(name, draft.savingThrows.includes(key), toggle("savingThrows", key), "saving throw"))}</FormGroup>
          </Box>
          <Box>
            <Typography variant="subtitle2">Primary abilities</Typography>
            <FormGroup row>{ABILITY_REFS.map(({ key, name }) => check(name, draft.primaryAbilities.includes(key), toggle("primaryAbilities", key), "primary ability"))}</FormGroup>
          </Box>
        </FormSection>
      )}

      {!subclass && (
        <FormSection title="Text blocks">
          <TextField label="Core traits" multiline minRows={3} value={draft.core} onChange={input("core")} helperText="Hit dice and hit points, as the class's own list." />
          <TextField label="Proficiencies" multiline minRows={3} value={draft.proficiencies} onChange={input("proficiencies")} />
          <TextField label="Starting equipment" multiline minRows={3} value={draft.equipment} onChange={input("equipment")} />
        </FormSection>
      )}

      {!subclass && (
        <FormSection title="Level table">
          {check("Proficiency bonus column (+2 at 1st, up one every four levels)", draft.proficiencyBonus, (on) => set({ proficiencyBonus: on }))}
          {draft.columns.map((column, index) => (
            <Box key={index} sx={{ display: "grid", gap: 1, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField size="small" sx={{ flex: 1 }} label={`Name of table column ${index + 1}`} value={column.name} onChange={(event) => setRow("columns", index, { name: event.target.value })} />
                <Button color="error" aria-label={`Remove table column ${index + 1}`} onClick={() => removeRow("columns", index)}>
                  Remove
                </Button>
              </Box>
              <TextField
                size="small"
                multiline
                minRows={3}
                label={`Values of table column ${index + 1}`}
                value={column.values}
                onChange={(event) => setRow("columns", index, { values: event.target.value })}
                helperText={`One value a line, the first for level 1, up to ${MAX_LEVEL} lines.`}
              />
            </Box>
          ))}
          <Box>
            <Button onClick={() => set({ columns: [...draft.columns, { name: "", values: "" }] })}>Add a table column</Button>
          </Box>
        </FormSection>
      )}

      <FormSection title="Features">
        {draft.features.map((feature, index) => (
          <Box key={index} sx={{ display: "grid", gap: 1, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField size="small" sx={{ flex: 2 }} label={`Name of feature ${index + 1}`} value={feature.name} onChange={(event) => setRow("features", index, { name: event.target.value })} />
              <TextField size="small" sx={{ flex: 1 }} label={`Levels of feature ${index + 1}`} value={feature.levels} onChange={(event) => setRow("features", index, { levels: event.target.value })} helperText="Such as 1, 5, 9" />
              <Button color="error" aria-label={`Remove feature ${index + 1}`} onClick={() => removeRow("features", index)}>
                Remove
              </Button>
            </Box>
            <TextField size="small" multiline minRows={3} label={`Description of feature ${index + 1}`} value={feature.desc} onChange={(event) => setRow("features", index, { desc: event.target.value })} helperText="A little markdown works: **bold**, *italic*, - lists and | tables |." />
          </Box>
        ))}
        <Box>
          <Button onClick={() => set({ features: [...draft.features, { name: "", levels: "", desc: "" }] })}>Add a feature</Button>
        </Box>
        {draft.kept.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {draft.kept.length} other table {draft.kept.length === 1 ? "column" : "columns"} (spell slots and the like) kept as they were.
          </Typography>
        )}
      </FormSection>
    </Box>
  );
}
