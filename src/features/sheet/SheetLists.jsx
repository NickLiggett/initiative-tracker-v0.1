import { Box, Chip, Paper, Typography } from "@mui/material";
import { spendUse, usesLeft } from "./sheetEntries";

/** A titled box of the sheet. */
function Section({ title, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle2" component="h2" sx={{ flex: 1 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

/** One feature's uses as little buttons: a filled one is a use left, tap to spend it; an empty one is spent, tap to take it back. */
function Uses({ feature, index, sheet, onChange }) {
  const { max, per } = feature.uses;
  const left = usesLeft(feature);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
      {Array.from({ length: max }, (_, n) => {
        const available = n < left;
        return (
          <Chip
            key={n}
            size="small"
            label={available ? "●" : "○"}
            aria-label={available ? `Spend a use of ${feature.name}` : `Take back a use of ${feature.name}`}
            disabled={!onChange}
            onClick={() => onChange(spendUse(sheet, index, available ? 1 : -1))}
            sx={{ minWidth: 28 }}
          />
        );
      })}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
        {left} of {max}, back on a {per} rest
      </Typography>
    </Box>
  );
}

/**
 * The attacks, and the features and traits with the uses they have, of a character's sheet. With `onChange` the uses can
 * be spent and a rest taken (it is given the sheet as it would then be, to save); without it, they are only shown.
 */
export default function SheetLists({ sheet, onChange }) {
  const attacks = sheet.attacks ?? [];
  const features = sheet.features ?? [];
  if (!attacks.length && !features.length) {
    return null;
  }

  return (
    <>
      {attacks.length > 0 && (
        <Section title="Attacks">
          <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& th, & td": { textAlign: "left", p: 0.75, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" } }}>
            <thead>
              <tr>
                <Typography component="th" variant="caption" color="text.secondary">Name</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Hit</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Damage</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Notes</Typography>
              </tr>
            </thead>
            <tbody>
              {attacks.map((attack, index) => (
                <tr key={index}>
                  <Typography component="td" variant="body2" sx={{ fontWeight: "bold" }}>{attack.name}</Typography>
                  <Typography component="td" variant="body2">{attack.bonus ?? ""}</Typography>
                  <Typography component="td" variant="body2">{attack.damage ?? ""}</Typography>
                  <Typography component="td" variant="body2" color="text.secondary">{attack.notes ?? ""}</Typography>
                </tr>
              ))}
            </tbody>
          </Box>
        </Section>
      )}

      {features.length > 0 && (
        <Section title="Features and traits">
          {features.map((feature, index) => (
            <Box key={index} sx={{ display: "grid", gap: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {feature.name}
                </Typography>
                {feature.source && <Chip size="small" variant="outlined" label={feature.source} />}
              </Box>
              {feature.uses && <Uses feature={feature} index={index} sheet={sheet} onChange={onChange} />}
              {feature.description && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                  {feature.description}
                </Typography>
              )}
            </Box>
          ))}
        </Section>
      )}
    </>
  );
}
