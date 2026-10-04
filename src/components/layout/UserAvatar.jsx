import { Avatar } from "@mui/material";
import { useSettings } from "../../settings/SettingsContext";

/** The signed-in user's picture, or the first letter of their username, or a plain person if we don't know who. */
export default function UserAvatar({ size = 40, sx }) {
  const { settings, username } = useSettings();

  return (
    <Avatar
      src={settings.avatar ?? undefined}
      alt={username ? `${username}'s picture` : "Your picture"}
      sx={{ width: size, height: size, fontSize: size / 2, bgcolor: "secondary.main", color: "secondary.contrastText", ...sx }}
    >
      {username ? username.charAt(0).toUpperCase() : null}
    </Avatar>
  );
}
