import { useCallback, useMemo, useState } from "react";
import { featsApi, listFeats, searchFeats } from "../../api/feats";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ResultsSearch from "../../components/resource/ResultsSearch";
import FeatComparison from "./FeatComparison";
import FeatEditor from "./FeatEditor";
import FeatFilters, { NO_FILTERS, searchFilters } from "./FeatFilters";
import FeatStatBlock from "./FeatStatBlock";
import { describeResult, featTypeLabel } from "./featFormat";

/**
 * Search for a feat and read it, compare it with another, or make, change and delete your own. Or list the feats of a
 * type, or with a prerequisite, as a table, a page at a time, and open one.
 */
export default function FeatsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const narrowed = useMemo(() => searchFilters(filters), [filters]);
  const search = useCallback((text, { signal }) => searchFeats(text, { ...narrowed, signal }), [narrowed]);
  const list = useCallback(({ criteria, ...paging }) => listFeats({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="feat"
      description="Feats are special abilities a character can take, often in place of an ability score increase, with the prerequisites for each."
      emptyText="Search for a feat to see what it does."
      renderSearch={(props) => <ResourceSearch noun="feat" search={search} secondary={describeResult} {...props} />}
      filters={<FeatFilters filters={filters} onChange={setFilters} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="feat" plural="feats" list={list} filterCriteria={narrowed} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(feat) => <FeatStatBlock feat={feat} />}
      renderComparison={(feats) => <FeatComparison feats={feats} />}
      renderEditor={({ resource, onSaved, onCancel }) => <FeatEditor feat={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(feat) => featsApi.copy(feat.key)}
      remove={(feat) => featsApi.remove(feat.key)}
    />
  );
}

/** What the table of feats shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (feat) => feat.name },
  { key: "type", label: "Type", sortField: "type", render: (feat) => featTypeLabel(feat.type) },
  { key: "prerequisite", label: "Prerequisite", sortField: "prerequisite", render: (feat) => feat.prerequisite ?? "" },
  { key: "source", label: "Source", render: (feat) => feat.document?.displayName ?? feat.document?.name ?? "" },
];
