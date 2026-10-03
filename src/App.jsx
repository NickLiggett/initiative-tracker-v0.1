import { useState } from "react";
import TopToolbar from "./components/layout/TopToolbar";
import MainDrawer from "./components/layout/MainDrawer";
import TrackerPage from "./features/tracker/TrackerPage";
import CreaturesPage from "./features/creatures/CreaturesPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { Pages } from "./constants/pages";

/** The app shell: toolbar, navigation drawer, and the current page. */
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(Pages.INITIATIVE_TRACKER);

  const toggleDrawer = (open) => () => setDrawerOpen(open);

  return (
    <div style={appStyles}>
      <div style={{ width: "100%" }}>
        <TopToolbar drawerOpen={drawerOpen} toggleDrawer={toggleDrawer} currentPage={currentPage} />
      </div>
      <MainDrawer
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      {currentPage === Pages.INITIATIVE_TRACKER && <TrackerPage />}
      {currentPage === Pages.CREATURES && <CreaturesPage />}
      {currentPage !== Pages.INITIATIVE_TRACKER && currentPage !== Pages.CREATURES && (
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
