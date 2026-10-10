import { useState } from "react";
import TopToolbar from "./components/layout/TopToolbar";
import MainDrawer from "./components/layout/MainDrawer";
import TrackerPage from "./features/tracker/TrackerPage";
import CreaturesPage from "./features/creatures/CreaturesPage";
import ItemsPage from "./features/items/ItemsPage";
import SettingsPage from "./features/settings/SettingsPage";
import PlayersPage from "./features/players/PlayersPage";
import SharingPage from "./features/sharing/SharingPage";
import BackgroundsPage from "./features/backgrounds/BackgroundsPage";
import EncountersPage from "./features/encounters/EncountersPage";
import FeatsPage from "./features/feats/FeatsPage";
import SpeciesPage from "./features/species/SpeciesPage";
import SpellsPage from "./features/spells/SpellsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { Pages } from "./constants/pages";

/** The app shell: toolbar, navigation drawer, and the current page. */
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(Pages.INITIATIVE_TRACKER);
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
      {currentPage === Pages.CREATURES && <CreaturesPage />}
      {currentPage === Pages.ITEMS && <ItemsPage />}
      {currentPage === Pages.SPELLS && <SpellsPage />}
      {currentPage === Pages.SPECIES && <SpeciesPage />}
      {currentPage === Pages.BACKGROUNDS && <BackgroundsPage />}
      {currentPage === Pages.FEATS && <FeatsPage />}
      {currentPage === Pages.SHARING && <SharingPage />}
      {currentPage === Pages.PLAYERS && <PlayersPage />}
      {currentPage === Pages.ENCOUNTERS && <EncountersPage onOpenTracker={() => setCurrentPage(Pages.INITIATIVE_TRACKER)} />}
      {currentPage === Pages.SETTINGS && <SettingsPage tab={settingsTab} onTabChange={setSettingsTab} />}
      {![Pages.INITIATIVE_TRACKER, Pages.CREATURES, Pages.ITEMS, Pages.SPELLS, Pages.SPECIES, Pages.BACKGROUNDS, Pages.FEATS, Pages.SHARING, Pages.PLAYERS, Pages.ENCOUNTERS, Pages.SETTINGS].includes(currentPage) && (
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
