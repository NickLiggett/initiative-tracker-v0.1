import { Box, TextField, ToggleButton } from "@mui/material";
import { FEAT_TYPES } from "./featFormat";

export const NO_FILTERS = { type: "", hasPrerequisite: false };

/** What to ask the search for, from the filters as chosen. */
export function searchFilters(filters) {
  return { type: filters.type || undefined, hasPrerequisite: filters.hasPrerequisite || undefined };
}

/** Narrows what the feat search finds: the kind of feat, and whether it has a prerequisite. */
export default function FeatFilters({ filters, onChange }) {
  const set = (changes) => onChange({ ...filters, ...changes });

  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1 }}>
      <TextField
        select
        size="small"
        SelectProps={{ native: true }}
        InputLabelProps={{ shrink: true }} // "Any" is an empty value, which would leave the label over it
        label="Type"
        value={filters.type}
        onChange={(event) => set({ type: event.target.value })}
        sx={{ minWidth: 150 }}
      >
        <option value="">Any</option>
        {FEAT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </TextField>
      <ToggleButton
        size="small"
        value="prerequisite"
        selected={filters.hasPrerequisite}
        onChange={() => set({ hasPrerequisite: !filters.hasPrerequisite })}
        sx={{ textTransform: "none" }}
      >
        Has a prerequisite
      </ToggleButton>
    </Box>
  );
}
