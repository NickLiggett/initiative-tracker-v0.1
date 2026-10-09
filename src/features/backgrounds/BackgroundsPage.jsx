import { backgroundsApi, searchBackgrounds } from "../../api/backgrounds";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import BackgroundEditor from "./BackgroundEditor";
import BackgroundStatBlock from "./BackgroundStatBlock";

/** Search for a background and read it, or make, change and delete your own. */
export default function BackgroundsPage() {
  return (
    <ResourcePage
      noun="background"
      emptyText="Search for a background to see what it gives a character."
      renderSearch={(props) => <ResourceSearch noun="background" search={searchBackgrounds} {...props} />}
      renderStatBlock={(background) => <BackgroundStatBlock background={background} />}
      renderEditor={({ resource, onSaved, onCancel }) => <BackgroundEditor background={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(background) => backgroundsApi.copy(background.key)}
      remove={(background) => backgroundsApi.remove(background.key)}
    />
  );
}
