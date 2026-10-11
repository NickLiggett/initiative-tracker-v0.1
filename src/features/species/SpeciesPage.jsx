import { useCallback } from "react";
import { searchSpecies, speciesApi } from "../../api/species";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ResultsSearch from "../../components/resource/ResultsSearch";
import SpeciesEditor from "./SpeciesEditor";
import SpeciesStatBlock from "./SpeciesStatBlock";
import { describeResult } from "./speciesFormat";

/**
 * Search for a species or subspecies and read it, or make, change and delete your own. They are listed as a table at
 * once, being few.
 */
export default function SpeciesPage() {
  const list = useCallback(({ criteria, ...paging }) => speciesApi.list({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="species"
      emptyText="Search for a species to see its traits."
      renderSearch={(props) => (
        <ResourceSearch noun="species" plural="species" search={searchSpecies} secondary={describeResult} {...props} />
      )}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="species" plural="species" list={list} filterCriteria={NO_FILTERS} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(species) => <SpeciesStatBlock species={species} />}
      renderEditor={({ resource, onSaved, onCancel }) => <SpeciesEditor species={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(species) => speciesApi.copy(species.key)}
      remove={(species) => speciesApi.remove(species.key)}
    />
  );
}

const NO_FILTERS = {};

/** What the table of species shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (species) => species.name },
  { key: "kind", label: "Kind", sortField: "isSubspecies", render: (species) => (species.isSubspecies ? "Subspecies" : "Species") },
  { key: "source", label: "Source", render: (species) => species.document?.displayName ?? species.document?.name ?? "" },
];
