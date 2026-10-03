import { useState } from "react";
import { Box, Button, Chip, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { ROLE_LABELS, SHARE_ROLES, normalizeUsername, shareProblem } from "./sharing";

/**
 * One of the user's own documents and who it is shared with, with a way to share it with someone else, change what
 * someone can do, and stop sharing.
 *
 * @param {{document: object, members: {username: string, role: string}[]}} entry
 * @param {boolean} busy whether something is being saved, which turns the controls off
 * @param {(username: string, role: string) => Promise<boolean>} onShare resolves to whether it worked
 * @param {(username: string, role: string) => void} onChangeRole
 * @param {(username: string) => void} onRemove
 */
export default function DocumentCard({ entry, me, busy, onShare, onChangeRole, onRemove }) {
  const { document, members } = entry;
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [tried, setTried] = useState(false);

  const name = normalizeUsername(username);
  const problem = shareProblem(name, members);
  const showProblem = tried && problem;

  const share = async (event) => {
    event.preventDefault();
    setTried(true);
    if (problem) {
      return;
    }
    if (await onShare(name, role)) {
      setUsername("");
      setTried(false);
    }
  };

  return (
    <Paper variant="outlined" role="group" aria-label={document.displayName ?? document.name} sx={{ p: 2, display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h6" component="h3">
          {document.displayName ?? document.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Everything you make that is saved here is shared with the people below.
        </Typography>
      </Box>

      <Box component="ul" aria-label="People" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
        {members.map((member) => (
          <Box key={member.username} component="li" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ flex: 1 }}>
              {member.username}
              {member.username === me.username && (
                <Typography component="span" color="text.secondary">
                  {" "}
                  (you)
                </Typography>
              )}
            </Typography>
            {member.role === "OWNER" ? (
              <Chip size="small" label={ROLE_LABELS.OWNER} />
            ) : (
              <>
                <TextField
                  select
                  size="small"
                  SelectProps={{ native: true }}
                  inputProps={{ "aria-label": `What ${member.username} can do` }}
                  value={member.role}
                  disabled={busy}
                  onChange={(event) => onChangeRole(member.username, event.target.value)}
                >
                  {SHARE_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </TextField>
                <Tooltip title="Stop sharing">
                  <span>
                    <IconButton aria-label={`Stop sharing with ${member.username}`} disabled={busy} onClick={() => onRemove(member.username)}>
                      <Delete />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Box>
        ))}
        {members.length <= 1 && (
          <Typography component="li" color="text.secondary">
            Not shared with anyone yet.
          </Typography>
        )}
      </Box>

      <Box component="form" noValidate onSubmit={share} aria-label="Share" sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Share with (username)"
          value={username}
          error={Boolean(showProblem)}
          helperText={showProblem || "They need to have signed in to the app once."}
          onChange={(event) => setUsername(event.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField
          select
          size="small"
          SelectProps={{ native: true }}
          label="They can"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {SHARE_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value].replace("Can ", "")}
            </option>
          ))}
        </TextField>
        <Button type="submit" variant="contained" disabled={busy} sx={{ height: 40 }}>
          Share
        </Button>
      </Box>
    </Paper>
  );
}
