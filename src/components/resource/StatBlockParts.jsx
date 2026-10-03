import { Box, Chip, Divider, Paper, Typography } from "@mui/material";

/** Where something comes from: its document as a chip (a link when the document has a page), and its publisher. */
export function SourceChip({ document }) {
  if (!document) {
    return null;
  }
  return (
    <>
      <Chip
        size="small"
        sx={{ mt: 1 }}
        label={document.displayName ?? document.name}
        {...(document.permalink && {
          component: "a",
          href: document.permalink,
          target: "_blank",
          rel: "noreferrer",
          clickable: true,
        })}
      />
      {document.publisher?.name && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {[document.publisher.name, document.gamesystem?.name].filter(Boolean).join(" · ")}
        </Typography>
      )}
    </>
  );
}

/** A small boxed fact: a label over its value. */
export function StatTile({ label, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Paper>
  );
}

/** A heading with a rule under it, over what belongs to it. */
export function Section({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" component="h3" sx={{ fontWeight: "bolder" }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}
