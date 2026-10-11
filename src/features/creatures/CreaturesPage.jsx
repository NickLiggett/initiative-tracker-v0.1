import { useCallback, useEffect, useMemo, useState } from "react";
import { copyCreature, deleteCreature, listCreatures } from "../../api/creatures";
import { listCreatureTypes, listSizes } from "../../api/reference";
import ResourcePage from "../../components/resource/ResourcePage";
import ResultsSearch from "../../components/resource/ResultsSearch";
import CreatureComparison from "./CreatureComparison";
import CreatureEditor from "./CreatureEditor";
import CreatureFilters, { NO_FILTERS, searchFilters } from "./CreatureFilters";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";
import { formatChallengeRating } from "./creatureFormat";

/**
 * Search for a creature and read its stat block, compare it with another, or make, change and delete your own. Or list
 * the creatures that match a name, type, size and challenge rating as a table, a page at a time, and open one.
 */
export default function CreaturesPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [lists, setLists] = useState({ types: [], sizes: [] });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // Without the lists the filters just have nothing to offer; searching still works.
    Promise.all([listCreatureTypes({ signal }), listSizes({ signal })])
      .then(([types, sizes]) => setLists({ types, sizes }))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const narrowed = useMemo(() => searchFilters(filters), [filters]);
  const list = useCallback(({ criteria, ...paging }) => listCreatures({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="creature"
      emptyText="Search for a creature to see its stat block."
      renderSearch={(props) => <CreatureSearch {...props} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch
          noun="creature"
          plural="creatures"
          list={list}
          filterCriteria={narrowed}
          columns={COLUMNS}
          onOpen={onOpen}
          extra={<CreatureFilters filters={filters} onChange={setFilters} {...lists} />}
        />
      )}
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

/** What the table of creatures shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (creature) => creature.name },
  { key: "cr", label: "CR", sortField: "challengeRating", render: (creature) => formatChallengeRating(creature.challengeRating) },
  { key: "type", label: "Type", render: (creature) => creature.type?.name ?? "" },
  { key: "size", label: "Size", render: (creature) => creature.size?.name ?? "" },
  { key: "ac", label: "AC", sortField: "armorClass", render: (creature) => creature.armorClass ?? "" },
  { key: "hp", label: "HP", sortField: "hitPoints", render: (creature) => creature.hitPoints ?? "" },
  { key: "source", label: "Source", render: (creature) => creature.document?.displayName ?? creature.document?.name ?? "" },
];
