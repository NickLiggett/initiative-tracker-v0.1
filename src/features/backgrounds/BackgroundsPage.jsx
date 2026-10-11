import { useCallback } from "react";
import { backgroundsApi, searchBackgrounds } from "../../api/backgrounds";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ResultsSearch from "../../components/resource/ResultsSearch";
import BackgroundComparison from "./BackgroundComparison";
import BackgroundEditor from "./BackgroundEditor";
import BackgroundStatBlock from "./BackgroundStatBlock";

/**
 * Search for a background and read it, compare it with another, or make, change and delete your own. They are listed as
 * a table at once, being few.
 */
export default function BackgroundsPage() {
  const list = useCallback(({ criteria, ...paging }) => backgroundsApi.list({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="background"
      emptyText="Search for a background to see what it gives a character."
      renderSearch={(props) => <ResourceSearch noun="background" search={searchBackgrounds} {...props} />}
      renderResults={({ onOpen }) => (
        <ResultsSearch noun="background" plural="backgrounds" list={list} filterCriteria={NO_FILTERS} columns={COLUMNS} onOpen={onOpen} autoRun />
      )}
      renderStatBlock={(background) => <BackgroundStatBlock background={background} />}
      renderComparison={(backgrounds) => <BackgroundComparison backgrounds={backgrounds} />}
      renderEditor={({ resource, onSaved, onCancel }) => <BackgroundEditor background={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(background) => backgroundsApi.copy(background.key)}
      remove={(background) => backgroundsApi.remove(background.key)}
    />
  );
}

const NO_FILTERS = {};

/** What the table of backgrounds shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (background) => background.name },
  { key: "benefits", label: "Benefits", render: (background) => (background.benefits ?? []).map((benefit) => benefit.name).filter(Boolean).join(", ") },
  { key: "source", label: "Source", render: (background) => background.document?.displayName ?? background.document?.name ?? "" },
];
