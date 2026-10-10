import { Box, TextField } from "@mui/material";

export const NO_FILTERS = { show: "" };

/** What to ask the search for, from the filters as chosen: `subclass` is false for classes only and true for subclasses only. */
export function searchFilters(filters) {
  return { subclass: filters.show === "classes" ? false : filters.show === "subclasses" ? true : undefined };
}

/** Narrows what the class search finds: classes, subclasses or both. */
export default function ClassFilters({ filters, onChange }) {
  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1 }}>
      <TextField
        select
        size="small"
        SelectProps={{ native: true }}
        InputLabelProps={{ shrink: true }} // "Classes and subclasses" is an empty value, which would leave the label over it
        label="Show"
        value={filters.show}
        onChange={(event) => onChange({ ...filters, show: event.target.value })}
        sx={{ minWidth: 220 }}
      >
        <option value="">Classes and subclasses</option>
        <option value="classes">Classes only</option>
        <option value="subclasses">Subclasses only</option>
      </TextField>
    </Box>
  );
}
