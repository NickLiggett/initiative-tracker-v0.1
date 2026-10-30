import { useState } from "react";
import TopToolbar from "./components/layout/TopToolbar";
import MainDrawer from "./components/layout/MainDrawer";
import TrackerPage from "./features/tracker/TrackerPage";
import ClassesPage from "./features/classes/ClassesPage";
import CreaturesPage from "./features/creatures/CreaturesPage";
import ItemsPage from "./features/items/ItemsPage";
import SettingsPage from "./features/settings/SettingsPage";
import PartyTrackerPage from "./features/party-tracker/PartyTrackerPage";
import PlayersPage from "./features/players/PlayersPage";
import SharingPage from "./features/sharing/SharingPage";
import BackgroundsPage from "./features/backgrounds/BackgroundsPage";
import EncountersPage from "./features/encounters/EncountersPage";
import FeatsPage from "./features/feats/FeatsPage";
import SpeciesPage from "./features/species/SpeciesPage";
import SpellsPage from "./features/spells/SpellsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import SheetPage from "./features/sheet/SheetPage";
import { sheetIdFromSearch } from "./features/sheet/sheetAddress";
import { Pages } from "./constants/pages";

/**
 * The pages of content, which are kept (hidden, not removed) once opened, so that coming back to one finds its search,
 * filters, the thing being read and the scroll as they were left.
 */
const KEPT_PAGES = [
  [Pages.CREATURES, CreaturesPage],
  [Pages.ITEMS, ItemsPage],
  [Pages.SPELLS, SpellsPage],
  [Pages.CLASSES, ClassesPage],
  [Pages.SPECIES, SpeciesPage],
  [Pages.BACKGROUNDS, BackgroundsPage],
  [Pages.FEATS, FeatsPage],
];

/**
 * The app. An address with `?sheet=ID` is a character's sheet, alone in its tab; anything else is the app shell with its
 * toolbar, navigation drawer and current page.
 */
export default function App() {
  const sheetId = sheetIdFromSearch(window.location.search);
  return sheetId === null ? <Shell /> : <SheetPage playerId={sheetId} />;
}

function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(Pages.INITIATIVE_TRACKER);
  const [opened, setOpened] = useState(() => new Set()); // the kept pages that have been opened
  if (KEPT_PAGES.some(([page]) => page === currentPage) && !opened.has(currentPage)) {
    setOpened(new Set(opened).add(currentPage));
  }
  const [settingsTab, setSettingsTab] = useState("profile");

  const toggleDrawer = (open) => () => setDrawerOpen(open);
  const openSettings = (tab) => {
    setSettingsTab(tab);
    setCurrentPage(Pages.SETTINGS);
  };

  return (
    <div style={appStyles}>
      <div style={{ width: "100%" }}>
        <TopToolbar drawerOpen={drawerOpen} toggleDrawer={toggleDrawer} currentPage={currentPage} onOpenSettings={openSettings} />
      </div>
      <MainDrawer
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      {currentPage === Pages.INITIATIVE_TRACKER && <TrackerPage />}
      {currentPage === Pages.PARTY_TRACKER && <PartyTrackerPage />}
      {KEPT_PAGES.filter(([page]) => opened.has(page)).map(([page, Page]) => (
        // "contents" leaves the layout as if the page were not wrapped; hiding it keeps it alive but out of sight
        <div key={page} data-page={page} style={{ display: page === currentPage ? "contents" : "none" }}>
          <Page />
        </div>
      ))}
      {currentPage === Pages.SHARING && <SharingPage />}
      {currentPage === Pages.PLAYERS && <PlayersPage />}
      {currentPage === Pages.ENCOUNTERS && <EncountersPage onOpenTracker={() => setCurrentPage(Pages.INITIATIVE_TRACKER)} />}
      {currentPage === Pages.SETTINGS && <SettingsPage tab={settingsTab} onTabChange={setSettingsTab} />}
      {![Pages.INITIATIVE_TRACKER, Pages.PARTY_TRACKER, ...KEPT_PAGES.map(([page]) => page), Pages.SHARING, Pages.PLAYERS, Pages.ENCOUNTERS, Pages.SETTINGS].includes(currentPage) && (
        <PlaceholderPage title={currentPage} />
      )}
    </div>
  );
}

const appStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  height: "100%",
  width: "100%",
};
