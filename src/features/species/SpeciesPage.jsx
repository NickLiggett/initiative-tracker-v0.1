import { useCallback, useMemo, useState } from "react";
import { searchSpecies, speciesApi } from "../../api/species";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SourceFilters, { NO_SOURCE_FILTERS, sourceCriteria } from "../../components/resource/SourceFilters";
import ResultsSearch from "../../components/resource/ResultsSearch";
import SpeciesEditor from "./SpeciesEditor";
import SpeciesStatBlock from "./SpeciesStatBlock";
import { describeResult } from "./speciesFormat";

/**
 * Search for a species or subspecies and read it, or make, change and delete your own. They are listed as a table at
 * once, being few.
 */
export default function SpeciesPage() {
  const [filters, setFilters] = useState(NO_SOURCE_FILTERS);
  const narrowed = useMemo(() => sourceCriteria(filters), [filters]);
  const search = useCallback((text, { signal }) => searchSpecies(text, { ...narrowed, signal }), [narrowed]);
  const list = useCallback(({ criteria, ...paging }) => speciesApi.list({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="species"
      description="Species (formerly races) give a character its size, speed, senses and innate traits."
      emptyText="Search for a species to see its traits."
      renderSearch={(props) => (
        <ResourceSearch noun="species" plural="species" search={search} secondary={describeResult} {...props} />
      )}
      filters={<SourceFilters filters={filters} onChange={setFilters} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="species" plural="species" list={list} filterCriteria={narrowed} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(species) => <SpeciesStatBlock species={species} />}
      renderEditor={({ resource, onSaved, onCancel }) => <SpeciesEditor species={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(species) => speciesApi.copy(species.key)}
      remove={(species) => speciesApi.remove(species.key)}
    />
  );
}


/** What the table of species shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (species) => species.name },
  { key: "kind", label: "Kind", sortField: "isSubspecies", render: (species) => (species.isSubspecies ? "Subspecies" : "Species") },
  { key: "source", label: "Source", render: (species) => species.document?.displayName ?? species.document?.name ?? "" },
];
