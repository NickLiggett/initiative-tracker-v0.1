import { useCallback, useMemo, useState } from "react";
import { searchClasses } from "../../api/classes";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ClassComparison from "./ClassComparison";
import ClassFilters, { NO_FILTERS, searchFilters } from "./ClassFilters";
import ClassStatBlock from "./ClassStatBlock";
import { describeResult } from "./classFormat";

/**
 * Search for a class or subclass and read it: its level table and features. Compare two to weigh them up. There is
 * nothing to make or change here yet: classes are read, not edited.
 */
export default function ClassesPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const narrowed = useMemo(() => searchFilters(filters), [filters]);
  const search = useCallback((text, { signal }) => searchClasses(text, { ...narrowed, signal }), [narrowed]);

  return (
    <ResourcePage
      noun="class"
      emptyText="Search for a class or subclass to see its level table and features."
      renderSearch={(props) => <ResourceSearch noun="class" plural="classes" search={search} secondary={describeResult} {...props} />}
      filters={<ClassFilters filters={filters} onChange={setFilters} />}
      renderStatBlock={(cls, { open }) => <ClassStatBlock cls={cls} open={open} />}
      renderComparison={(classes) => <ClassComparison classes={classes} />}
    />
  );
}
