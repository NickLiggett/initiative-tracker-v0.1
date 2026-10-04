import { Avatar } from "@mui/material";
import { avatarUrl } from "../../api/profile";
import { useSettings } from "../../settings/SettingsContext";

/**
 * A user's picture, or the first letter of their username when they have none (or it can't be shown), or a plain
 * person if we don't know who. Without a `username` it is the signed-in user's.
 */
export default function UserAvatar({ username, size = 40, sx }) {
  const { settings, username: me } = useSettings();
  const name = username ?? me;
  const mine = username === undefined || username === me;
  // Anyone's picture can be asked for by username. We know whether ours exists; for others we try, and the letter
  // shows if there is none.
  const showsPicture = name && (!mine || settings.avatarVersion !== null);

  return (
    <Avatar
      src={showsPicture ? avatarUrl(name, mine ? settings.avatarVersion : undefined) : undefined}
      alt={name ? `${name}'s picture` : "Your picture"}
      sx={{ width: size, height: size, fontSize: size / 2, bgcolor: "secondary.main", color: "secondary.contrastText", ...sx }}
    >
      {name ? name.charAt(0).toUpperCase() : null}
    </Avatar>
  );
}
