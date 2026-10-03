import { searchCreatures } from "../../api/creatures";
import ResourceSearch from "../../components/resource/ResourceSearch";

/** Picks a creature by searching the backend as you type. */
export default function CreatureSearch(props) {
  return <ResourceSearch noun="creature" search={searchCreatures} {...props} />;
}
