import { Paper, Typography } from "@mui/material";

/** A titled box of form fields. */
export default function FormSection({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
