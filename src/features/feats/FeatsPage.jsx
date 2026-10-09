import { useCallback, useMemo, useState } from "react";
import { featsApi, searchFeats } from "../../api/feats";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import FeatEditor from "./FeatEditor";
import FeatFilters, { NO_FILTERS, searchFilters } from "./FeatFilters";
import FeatStatBlock from "./FeatStatBlock";
import { describeResult } from "./featFormat";

/** Search for a feat and read it, or make, change and delete your own. */
export default function FeatsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const narrowed = useMemo(() => searchFilters(filters), [filters]);
  const search = useCallback((text, { signal }) => searchFeats(text, { ...narrowed, signal }), [narrowed]);

  return (
    <ResourcePage
      noun="feat"
      emptyText="Search for a feat to see what it does."
      renderSearch={(props) => <ResourceSearch noun="feat" search={search} secondary={describeResult} {...props} />}
      filters={<FeatFilters filters={filters} onChange={setFilters} />}
      renderStatBlock={(feat) => <FeatStatBlock feat={feat} />}
      renderEditor={({ resource, onSaved, onCancel }) => <FeatEditor feat={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(feat) => featsApi.copy(feat.key)}
      remove={(feat) => featsApi.remove(feat.key)}
    />
  );
}
