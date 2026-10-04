import { useState } from "react";
import { Box, Divider, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { useSettings } from "../../settings/SettingsContext";
import UserAvatar from "./UserAvatar";

/**
 * The picture at the right of the toolbar, which opens a menu for the account.
 * @param {(section: "profile"|"appearance") => void} onOpenSettings goes to that part of the Settings page
 */
export default function UserMenu({ onOpenSettings }) {
  const { username } = useSettings();
  const [anchorEl, setAnchorEl] = useState(null);
  const close = () => setAnchorEl(null);
  const go = (section) => () => {
    close();
    onOpenSettings(section);
  };

  return (
    <Box>
      <IconButton
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ p: 0.5 }}
      >
        <UserAvatar />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            Signed in as
          </Typography>
          <Typography sx={{ fontWeight: "bold" }}>{username ?? "no one"}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={go("profile")}>Profile</MenuItem>
        <MenuItem onClick={go("appearance")}>Appearance</MenuItem>
      </Menu>
    </Box>
  );
}
