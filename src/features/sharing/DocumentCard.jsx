import { useState } from "react";
import { Box, Button, Chip, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Delete, MailOutline } from "@mui/icons-material";
import UserAvatar from "../../components/layout/UserAvatar";
import { ROLE_LABELS, SHARE_ROLES, parseShareTarget, shareTargetProblem } from "./sharing";

/**
 * One of the user's own documents and who it is shared with, with a way to share it with someone else (by username,
 * or by inviting an email address), change what someone can do, stop sharing, and cancel invitations.
 *
 * @param {{document: object, members: {username: string, role: string}[], invitations?: {id: number, email: string, role: string}[]}} entry
 * @param {boolean} busy whether something is being saved, which turns the controls off
 * @param {(target: {kind: "username"|"email", value: string}, role: string) => Promise<boolean>} onShare resolves to whether it worked
 * @param {(username: string, role: string) => void} onChangeRole
 * @param {(username: string) => void} onRemove
 * @param {(invitation: object) => void} onCancelInvitation
 */
export default function DocumentCard({ entry, me, busy, onShare, onChangeRole, onRemove, onCancelInvitation }) {
  const { document, members, invitations = [] } = entry;
  const [text, setText] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [tried, setTried] = useState(false);

  const target = parseShareTarget(text);
  const problem = shareTargetProblem(target, members);
  const showProblem = tried && problem;

  const share = async (event) => {
    event.preventDefault();
    setTried(true);
    if (problem) {
      return;
    }
    if (await onShare(target, role)) {
      setText("");
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
            <UserAvatar username={member.username} size={28} />
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

      {invitations.length > 0 && (
        <Box component="ul" aria-label="Invited" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
          {invitations.map((invitation) => (
            <Box key={invitation.id} component="li" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MailOutline color="action" sx={{ width: 28 }} />
              <Typography sx={{ flex: 1, wordBreak: "break-all" }}>
                {invitation.email}
                <Typography component="span" color="text.secondary">
                  {" "}
                  (waiting for them to sign in)
                </Typography>
              </Typography>
              <Chip size="small" label={ROLE_LABELS[invitation.role] ?? invitation.role} />
              <Tooltip title="Cancel invitation">
                <span>
                  <IconButton aria-label={`Cancel invitation to ${invitation.email}`} disabled={busy} onClick={() => onCancelInvitation(invitation)}>
                    <Delete />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Box component="form" noValidate onSubmit={share} aria-label="Share" sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Share with (username or email)"
          value={text}
          error={Boolean(showProblem)}
          helperText={showProblem || "A username, or an email address to invite someone who hasn't signed in yet."}
          onChange={(event) => setText(event.target.value)}
          sx={{ minWidth: 320 }}
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
