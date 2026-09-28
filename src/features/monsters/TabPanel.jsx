import { Box, Typography } from "@mui/material";

/** One tab's content; rendered only while its tab is selected. */
export function TabPanel({ value, index, children }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`monster-tabpanel-${index}`} aria-labelledby={`monster-tab-${index}`}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/** A label on the left and its value on the right, over a rule. */
export function InfoRow({ label, children }) {
  return (
    <div style={infoRowStyles}>
      <Typography style={labelStyles}>{label}</Typography>
      <Typography component="div" style={{ textAlign: "right" }}>
        {children}
      </Typography>
    </div>
  );
}

/** A heading with text under it, for longer values. */
export function InfoBlock({ label, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <Typography style={labelStyles}>{label}</Typography>
      <Typography component="div">{children}</Typography>
    </div>
  );
}

export function SectionHeading({ children }) {
  return <Typography style={{ fontSize: 20, fontWeight: "bolder", marginTop: 30 }}>{children}</Typography>;
}

const labelStyles = { fontWeight: "bolder", fontSize: 20 };

const infoRowStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 16,
  width: "100%",
  borderBottom: "1px solid",
  marginTop: 15,
  marginBottom: 15,
};
