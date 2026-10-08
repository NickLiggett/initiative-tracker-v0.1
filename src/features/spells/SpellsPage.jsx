import { useCallback, useEffect, useMemo, useState } from "react";
import { listClasses, listDamageTypes, listSpellSchools } from "../../api/reference";
import { searchSpells, spellsApi } from "../../api/spells";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SpellComparison from "./SpellComparison";
import SpellEditor from "./SpellEditor";
import SpellFilters, { NO_FILTERS, searchFilters } from "./SpellFilters";
import SpellStatBlock from "./SpellStatBlock";
import { spellKind } from "./spellFormat";

/** Search for a spell and read it, compare it with another, or make, change and delete your own. */
export default function SpellsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [lists, setLists] = useState({ schools: [], classes: [], damageTypes: [] });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // Without the lists the filters just have nothing to offer; searching still works.
    Promise.all([listSpellSchools({ signal }), listClasses({ signal }), listDamageTypes({ signal })])
      .then(([schools, classes, damageTypes]) => setLists({ schools, classes, damageTypes }))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const narrowed = useMemo(() => searchFilters(filters, lists.classes), [filters, lists.classes]);
  const search = useCallback((text, { signal }) => searchSpells(text, { ...narrowed, signal }), [narrowed]);

  return (
    <ResourcePage
      noun="spell"
      emptyText="Search for a spell to see its details."
      renderSearch={(props) => (
        <ResourceSearch noun="spell" plural="spells" search={search} secondary={describeResult} {...props} />
      )}
      filters={<SpellFilters filters={filters} onChange={setFilters} {...lists} />}
      renderStatBlock={(spell) => <SpellStatBlock spell={spell} />}
      renderComparison={(spells) => <SpellComparison spells={spells} />}
      renderEditor={({ resource, onSaved, onCancel }) => <SpellEditor spell={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(spell) => spellsApi.copy(spell.key)}
      remove={(spell) => spellsApi.remove(spell.key)}
    />
  );
}

/** "3rd-level evocation · 5e 2014 Rules" */
function describeResult(spell) {
  return [spellKind(spell), spell.document?.displayName ?? spell.document?.name].filter(Boolean).join(" · ");
}
