import { useCallback, useMemo, useState } from "react";
import { backgroundsApi, searchBackgrounds } from "../../api/backgrounds";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SourceFilters, { NO_SOURCE_FILTERS, sourceCriteria } from "../../components/resource/SourceFilters";
import ResultsSearch from "../../components/resource/ResultsSearch";
import BackgroundComparison from "./BackgroundComparison";
import BackgroundEditor from "./BackgroundEditor";
import BackgroundStatBlock from "./BackgroundStatBlock";

/**
 * Search for a background and read it, compare it with another, or make, change and delete your own. They are listed as
 * a table at once, being few.
 */
export default function BackgroundsPage() {
  const [filters, setFilters] = useState(NO_SOURCE_FILTERS);
  const narrowed = useMemo(() => sourceCriteria(filters), [filters]);
  const search = useCallback((text, { signal }) => searchBackgrounds(text, { ...narrowed, signal }), [narrowed]);
  const list = useCallback(({ criteria, ...paging }) => backgroundsApi.list({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="background"
      description="Backgrounds describe where a character came from: the skills, tools, languages and starting equipment it grants, and the feat or feature that comes with it."
      emptyText="Search for a background to see what it gives a character."
      renderSearch={(props) => <ResourceSearch noun="background" search={search} {...props} />}
      filters={<SourceFilters filters={filters} onChange={setFilters} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="background" plural="backgrounds" list={list} filterCriteria={narrowed} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(background) => <BackgroundStatBlock background={background} />}
      renderComparison={(backgrounds) => <BackgroundComparison backgrounds={backgrounds} />}
      renderEditor={({ resource, onSaved, onCancel }) => <BackgroundEditor background={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(background) => backgroundsApi.copy(background.key)}
      remove={(background) => backgroundsApi.remove(background.key)}
    />
  );
}


/** What the table of backgrounds shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (background) => background.name },
  { key: "benefits", label: "Benefits", render: (background) => (background.benefits ?? []).map((benefit) => benefit.name).filter(Boolean).join(", ") },
  { key: "source", label: "Source", render: (background) => background.document?.displayName ?? background.document?.name ?? "" },
];
