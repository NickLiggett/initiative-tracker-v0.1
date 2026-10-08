import { Box, TextField, ToggleButton } from "@mui/material";
import { levelName } from "./spellFormat";

export const NO_FILTERS = { level: "", school: "", className: "", damageType: "", concentration: false, ritual: false };

/**
 * The classes to choose from by name: a class that exists under several rules (the 2014 and 2024 Wizard) is one choice,
 * which finds the spells of any of them.
 * @param {object[]} classes the backend's classes, each with a `key` and a `name`
 * @returns {{name: string, keys: string[]}[]} by name
 */
export function classChoices(classes) {
  const byName = new Map();
  for (const one of classes) {
    byName.set(one.name, [...(byName.get(one.name) ?? []), one.key]);
  }
  return [...byName].map(([name, keys]) => ({ name, keys })).sort((a, b) => a.name.localeCompare(b.name));
}

/** What to ask the search for, from the filters as chosen. */
export function searchFilters(filters, classes) {
  const choice = classChoices(classes).find((one) => one.name === filters.className);
  return {
    level: filters.level === "" ? undefined : Number(filters.level),
    school: filters.school || undefined,
    classKeys: choice?.keys ?? [],
    damageType: filters.damageType || undefined,
    concentration: filters.concentration || undefined,
    ritual: filters.ritual || undefined,
  };
}

const LEVELS = Array.from({ length: 10 }, (_, level) => ({ value: String(level), label: level === 0 ? "Cantrip" : levelName(level) }));

/**
 * Narrows what the spell search finds: level, school, class and damage type, and whether it needs concentration or is a
 * ritual.
 * @param {object} filters see NO_FILTERS
 * @param {object[]} schools the schools of magic to choose from
 * @param {object[]} classes the classes to choose from
 * @param {object[]} damageTypes the damage types to choose from
 */
export default function SpellFilters({ filters, onChange, schools, classes, damageTypes }) {
  const set = (changes) => onChange({ ...filters, ...changes });

  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1 }}>
      <Select label="Level" value={filters.level} options={LEVELS} onChange={(level) => set({ level })} />
      <Select
        label="School"
        value={filters.school}
        options={schools.map(({ key, name }) => ({ value: key, label: name }))}
        onChange={(school) => set({ school })}
      />
      <Select
        label="Class"
        value={filters.className}
        options={classChoices(classes).map(({ name }) => ({ value: name, label: name }))}
        onChange={(className) => set({ className })}
      />
      <Select
        label="Damage"
        value={filters.damageType}
        options={damageTypes.map(({ key, name }) => ({ value: key, label: name }))}
        onChange={(damageType) => set({ damageType })}
      />
      <ToggleButton
        size="small"
        value="concentration"
        selected={filters.concentration}
        onChange={() => set({ concentration: !filters.concentration })}
        sx={{ textTransform: "none" }}
      >
        Concentration
      </ToggleButton>
      <ToggleButton size="small" value="ritual" selected={filters.ritual} onChange={() => set({ ritual: !filters.ritual })} sx={{ textTransform: "none" }}>
        Ritual
      </ToggleButton>
    </Box>
  );
}

/** A choice of `{value, label}` options, or "Any". */
function Select({ label, value, options, onChange }) {
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }} // "Any" is an empty value, which would leave the label over it
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 150 }}
    >
      <option value="">Any</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </TextField>
  );
}
