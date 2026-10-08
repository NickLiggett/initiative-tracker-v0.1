import { searchSpecies, speciesApi } from "../../api/species";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SpeciesEditor from "./SpeciesEditor";
import SpeciesStatBlock from "./SpeciesStatBlock";
import { describeResult } from "./speciesFormat";

/** Search for a species or subspecies and read it, or make, change and delete your own. */
export default function SpeciesPage() {
  return (
    <ResourcePage
      noun="species"
      emptyText="Search for a species to see its traits."
      renderSearch={(props) => (
        <ResourceSearch noun="species" plural="species" search={searchSpecies} secondary={describeResult} {...props} />
      )}
      renderStatBlock={(species) => <SpeciesStatBlock species={species} />}
      renderEditor={({ resource, onSaved, onCancel }) => <SpeciesEditor species={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(species) => speciesApi.copy(species.key)}
      remove={(species) => speciesApi.remove(species.key)}
    />
  );
}
