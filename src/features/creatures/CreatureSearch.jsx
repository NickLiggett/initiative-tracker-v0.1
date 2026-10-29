import { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { searchCreatures } from "../../api/creatures";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SourceFilter, { sourceParam } from "../../components/resource/SourceFilter";

/**
 * Picks a creature by searching the backend as you type.
 * @param {object} [criteria] more to narrow the search by (see searchCreatures); keep it the same object between renders
 *   unless it changes, as the search starts again when it does
 */
export default function CreatureSearch({ criteria, ...props }) {
  const search = useCallback((text, { signal }) => searchCreatures(text, { ...criteria, signal }), [criteria]);
  return <ResourceSearch noun="creature" search={search} {...props} />;
}

/**
 * A creature search with a choice of the sources to search in, for where the page has no filters of its own.
 * `resetKey` changing empties the search (but keeps the sources chosen).
 */
export function CreatureSearchWithSources({ fullWidth = false, resetKey, ...props }) {
  const [sources, setSources] = useState([]);
  const criteria = useMemo(() => ({ document: sourceParam(sources) }), [sources]);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, width: fullWidth ? "100%" : undefined }}>
      <Box sx={{ flexGrow: fullWidth ? 1 : 0 }}>
        <CreatureSearch key={resetKey} criteria={criteria} fullWidth={fullWidth} {...props} />
      </Box>
      <SourceFilter value={sources} onChange={setSources} />
    </Box>
  );
}
