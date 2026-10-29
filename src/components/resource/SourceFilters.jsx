import { Box } from "@mui/material";
import SourceFilter, { sourceParam } from "./SourceFilter";

export const NO_SOURCE_FILTERS = { sources: [] };

/** What to ask the search for, from the filters as chosen. */
export const sourceCriteria = (filters) => ({ document: sourceParam(filters.sources) });

/** The filters of a page that has no others than the sources to look in. */
export default function SourceFilters({ filters, onChange }) {
  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1 }}>
      <SourceFilter value={filters.sources} onChange={(sources) => onChange({ ...filters, sources })} />
    </Box>
  );
}
