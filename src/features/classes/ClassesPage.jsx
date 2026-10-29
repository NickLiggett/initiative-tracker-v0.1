import { useCallback, useMemo, useState } from "react";
import { classesApi, searchClasses } from "../../api/classes";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ResultsSearch from "../../components/resource/ResultsSearch";
import ClassComparison from "./ClassComparison";
import ClassFilters, { NO_FILTERS, searchFilters } from "./ClassFilters";
import ClassStatBlock from "./ClassStatBlock";
import { casterLabel, describeResult, hitDie, names } from "./classFormat";

/**
 * Search for a class or subclass and read it: its level table and features. Compare two to weigh them up. There is
 * nothing to make or change here yet: classes are read, not edited. They are listed as a table at once, being few.
 */
export default function ClassesPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const narrowed = useMemo(() => searchFilters(filters), [filters]);
  const search = useCallback((text, { signal }) => searchClasses(text, { ...narrowed, signal }), [narrowed]);
  const list = useCallback(({ criteria, ...paging }) => classesApi.list({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="class"
      description="Classes are what a character does: hit dice, proficiencies, and the features gained at each level, with their subclasses."
      emptyText="Search for a class or subclass to see its level table and features."
      renderSearch={(props) => <ResourceSearch noun="class" plural="classes" search={search} secondary={describeResult} {...props} />}
      filters={<ClassFilters filters={filters} onChange={setFilters} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="class" plural="classes" list={list} filterCriteria={narrowed} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(cls, { open }) => <ClassStatBlock cls={cls} open={open} />}
      renderComparison={(classes) => <ClassComparison classes={classes} />}
    />
  );
}

/** What the table of classes shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (cls) => cls.name },
  { key: "kind", label: "Kind", render: (cls) => (cls.subclassOf ? `Subclass of ${cls.subclassOf.name}` : "Class") },
  { key: "casting", label: "Spellcasting", sortField: "casterType", render: (cls) => casterLabel(cls.casterType) },
  { key: "hitDie", label: "Hit die", render: (cls) => hitDie(cls) },
  { key: "abilities", label: "Primary ability", render: (cls) => names(cls.primaryAbilities) },
  { key: "source", label: "Source", render: (cls) => cls.document?.displayName ?? cls.document?.name ?? "" },
];
