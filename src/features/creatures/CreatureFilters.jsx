import { Box, TextField } from "@mui/material";
import SavedFilters from "../../components/resource/SavedFilters";
import SourceFilter, { sourceParam } from "../../components/resource/SourceFilter";

export const NO_FILTERS = { type: "", size: "", crMin: "", crMax: "", sources: [] };

const FRACTIONS = { "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 };

/** A challenge rating as typed ("5", "0.5", "1/4"), or undefined if it is blank or not one. */
export function parseChallengeRating(text) {
  const typed = String(text ?? "").trim();
  if (typed === "") {
    return undefined;
  }
  if (typed in FRACTIONS) {
    return FRACTIONS[typed];
  }
  const number = Number(typed);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/** What to ask the creature list for, from the filters as chosen. */
export function searchFilters(filters) {
  return {
    type: filters.type || undefined,
    size: filters.size || undefined,
    crMin: parseChallengeRating(filters.crMin),
    crMax: parseChallengeRating(filters.crMax),
    document: sourceParam(filters.sources),
  };
}

/**
 * Narrows the creatures listed: type, size, and a range of challenge ratings.
 * @param {object[]} types the creature types to choose from
 * @param {object[]} sizes the sizes to choose from
 */
export default function CreatureFilters({ filters, onChange, types, sizes }) {
  const set = (changes) => onChange({ ...filters, ...changes });

  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
      <Select label="Type" value={filters.type} options={types} onChange={(type) => set({ type })} />
      <Select label="Size" value={filters.size} options={sizes} onChange={(size) => set({ size })} />
      <TextField size="small" label="CR from" value={filters.crMin} onChange={(event) => set({ crMin: event.target.value })} sx={{ width: 90 }} />
      <TextField size="small" label="CR to" value={filters.crMax} onChange={(event) => set({ crMax: event.target.value })} sx={{ width: 90 }} />
      <SourceFilter value={filters.sources} onChange={(sources) => set({ sources })} />
      <SavedFilters page="creatures" defaults={NO_FILTERS} filters={filters} onApply={onChange} />
    </Box>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }}
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 140 }}
    >
      <option value="">Any</option>
      {options.map(({ key, name }) => (
        <option key={key} value={key}>
          {name}
        </option>
      ))}
    </TextField>
  );
}
