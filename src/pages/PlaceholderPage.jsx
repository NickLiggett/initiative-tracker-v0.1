import { Typography } from "@mui/material";

/** For pages in the drawer that don't exist yet. */
export default function PlaceholderPage({ title }) {
  return (
    <div style={{ marginTop: 40, textAlign: "center" }}>
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Coming soon.
      </Typography>
    </div>
  );
}
