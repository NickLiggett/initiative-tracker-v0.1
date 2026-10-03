import { copyCreature, deleteCreature } from "../../api/creatures";
import ResourcePage from "../../components/resource/ResourcePage";
import CreatureComparison from "./CreatureComparison";
import CreatureEditor from "./CreatureEditor";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";

/** Search for a creature and read its stat block, compare it with another, or make, change and delete your own. */
export default function CreaturesPage() {
  return (
    <ResourcePage
      noun="creature"
      emptyText="Search for a creature to see its stat block."
      renderSearch={(props) => <CreatureSearch {...props} />}
      renderStatBlock={(creature) => <CreatureStatBlock creature={creature} />}
      renderComparison={(creatures) => <CreatureComparison creatures={creatures} />}
      renderEditor={({ resource, onSaved, onCancel }) => (
        <CreatureEditor creature={resource} onSaved={onSaved} onCancel={onCancel} />
      )}
      copy={(creature) => copyCreature(creature.key)}
      remove={(creature) => deleteCreature(creature.key)}
    />
  );
}
