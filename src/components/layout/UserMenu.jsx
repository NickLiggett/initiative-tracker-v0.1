import { useState } from "react";
import { Box, Divider, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { useSettings } from "../../settings/SettingsContext";
import UserAvatar from "./UserAvatar";

/**
 * The picture at the right of the toolbar, which opens a menu for the account.
 * @param {(section: "profile"|"appearance") => void} onOpenSettings goes to that part of the Settings page
 */
export default function UserMenu({ onOpenSettings }) {
  const { username } = useSettings();
  const { status, accountUrl, signOut } = useAuth();
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
        {status === "signedIn" && <Divider />}
        {status === "signedIn" && (
          <MenuItem component="a" href={accountUrl} target="_blank" rel="noreferrer" onClick={close}>
            Manage account
          </MenuItem>
        )}
        {status === "signedIn" && (
          <MenuItem
            onClick={() => {
              close();
              signOut();
            }}
          >
            Sign out
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
