import { Box, Tab, Tabs, Typography } from "@mui/material";
import AppearanceSettings from "./AppearanceSettings";
import ProfileSettings from "./ProfileSettings";
import TrackerSettings from "./TrackerSettings";

export const SETTINGS_TABS = ["profile", "appearance", "tracker"];

/**
 * The user's settings: their profile picture, how the site looks, and how the initiative tracker counts hit points.
 * @param {"profile"|"appearance"|"tracker"} tab which part is showing
 * @param {(tab: string) => void} onTabChange
 */
export default function SettingsPage({ tab = "profile", onTabChange }) {
  return (
    <Box sx={{ width: "100%", maxWidth: 800, p: 2, boxSizing: "border-box" }}>
      <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder", mb: 2 }}>
        Settings
      </Typography>
      <Tabs value={tab} onChange={(event, next) => onTabChange(next)} aria-label="Settings sections" sx={{ mb: 3 }}>
        <Tab value="profile" label="Profile" />
        <Tab value="appearance" label="Appearance" />
        <Tab value="tracker" label="Tracker" />
      </Tabs>
      {tab === "appearance" ? <AppearanceSettings /> : tab === "tracker" ? <TrackerSettings /> : <ProfileSettings />}
    </Box>
  );
}
