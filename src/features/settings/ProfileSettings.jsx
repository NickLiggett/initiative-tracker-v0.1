import { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import UserAvatar from "../../components/layout/UserAvatar";
import { ACCEPTED_TYPES, checkAvatarFile, fileToAvatar } from "../../settings/avatar";
import { useSettings } from "../../settings/SettingsContext";

/** Who the user is, and the picture shown for them at the right of the toolbar and wherever people are listed. */
export default function ProfileSettings() {
  const { settings, username, setAvatar, removeAvatar } = useSettings();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = async (event) => {
    const [file] = event.target.files;
    event.target.value = ""; // so that choosing the same file again still counts
    setSaved(null);
    const problem = checkAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    let picture;
    try {
      picture = await fileToAvatar(file);
    } catch {
      setError("Couldn't read that picture. Try another one.");
      setBusy(false);
      return;
    }
    try {
      await setAvatar(picture);
      setSaved("Your picture is changed.");
    } catch (e) {
      setError(`Couldn't save your picture: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await removeAvatar();
      setSaved("Your picture is removed.");
    } catch (e) {
      setError(`Couldn't remove your picture: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
        <UserAvatar size={96} />
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography variant="h6" component="h3">
            {username ?? "Not signed in"}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Your picture is shown at the top right of every page, and to the people you share with. It is cropped to a
            square from the middle.
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button component="label" variant="contained" disabled={busy}>
              Upload picture
              <input hidden type="file" accept={ACCEPTED_TYPES.join(",")} onChange={choose} />
            </Button>
            <Button onClick={remove} disabled={busy || settings.avatarVersion === null}>
              Remove picture
            </Button>
          </Box>
        </Box>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && !error && (
        <Alert severity="success" role="status">
          {saved}
        </Alert>
      )}
      <Alert severity="info" role="note">
        Your picture is saved to your account, so it follows you to other browsers.
      </Alert>
    </Box>
  );
}
