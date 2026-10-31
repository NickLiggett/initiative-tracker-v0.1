import { useState } from "react";
import { Box, Button, Chip, IconButton, Paper, Typography } from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
import EntryDialog from "./EntryDialog";
import { MAX_ATTACKS, MAX_FEATURES, attackDrafts, blankAttack, blankFeature, featureDrafts, spendUse, usesLeft, withAttack, withFeature, withoutAttack, withoutFeature } from "./sheetEntries";

/** A titled box of the sheet. */
function Section({ title, action, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle2" component="h2" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {action}
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
 * `show` is "attacks" or "features" for one of the two; without it both are. With `onChange` an attack or feature can be added,
 * changed or deleted, in a box of its own, and the lists are shown even when empty.
 */
export default function SheetLists({ sheet, onChange, show }) {
  const [editing, setEditing] = useState(null); // { kind, index (null for a new one), row }
  const attacks = show === "features" ? [] : (sheet.attacks ?? []);
  const features = show === "attacks" ? [] : (sheet.features ?? []);
  const editable = Boolean(onChange);
  if (!editable && !attacks.length && !features.length) {
    return null;
  }
  const showAttacks = show !== "features" && (editable || attacks.length > 0);
  const showFeatures = show !== "attacks" && (editable || features.length > 0);
  const add = (kind, count, max, blank, label) => (
    <Button size="small" startIcon={<Add />} disabled={count >= max} onClick={() => setEditing({ kind, index: null, row: blank() })}>
      {label}
    </Button>
  );
  const pencil = (kind, index, row, name) => (
    <IconButton size="small" aria-label={`Edit ${name || (kind === "attack" ? "attack" : "feature")}`} onClick={() => setEditing({ kind, index, row })}>
      <Edit fontSize="inherit" />
    </IconButton>
  );
  const save = (row) => {
    const { kind, index } = editing;
    setEditing(null);
    onChange(kind === "attack" ? withAttack(sheet, index, row) : withFeature(sheet, index, row));
  };
  const remove = () => {
    const { kind, index } = editing;
    setEditing(null);
    onChange(kind === "attack" ? withoutAttack(sheet, index) : withoutFeature(sheet, index));
  };

  return (
    <>
      {showAttacks && (
        <Section title="Attacks" action={editable && add("attack", attacks.length, MAX_ATTACKS, blankAttack, "Add an attack")}>
          {attacks.length === 0 && (
            <Typography color="text.secondary">No attacks yet.</Typography>
          )}
          {attacks.length > 0 && (
          <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& th, & td": { textAlign: "left", p: 0.75, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" } }}>
            <thead>
              <tr>
                <Typography component="th" variant="caption" color="text.secondary">Name</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Hit</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Damage</Typography>
                <Typography component="th" variant="caption" color="text.secondary">Notes</Typography>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {attacks.map((attack, index) => (
                <tr key={index}>
                  <Typography component="td" variant="body2" sx={{ fontWeight: "bold" }}>{attack.name}</Typography>
                  <Typography component="td" variant="body2">{attack.bonus ?? ""}</Typography>
                  <Typography component="td" variant="body2">{attack.damage ?? ""}</Typography>
                  <Typography component="td" variant="body2" color="text.secondary">{attack.notes ?? ""}</Typography>
                  {editable && <td>{pencil("attack", index, attackDrafts([attack])[0], attack.name)}</td>}
                </tr>
              ))}
            </tbody>
          </Box>
          )}
        </Section>
      )}

      {showFeatures && (
        <Section title="Features and traits" action={editable && add("feature", features.length, MAX_FEATURES, blankFeature, "Add a feature")}>
          {features.length === 0 && <Typography color="text.secondary">No features yet.</Typography>}
          {features.map((feature, index) => (
            <Box key={index} sx={{ display: "grid", gap: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {feature.name}
                </Typography>
                {feature.source && <Chip size="small" variant="outlined" label={feature.source} />}
                {editable && pencil("feature", index, featureDrafts([feature])[0], feature.name)}
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
      {editing && (
        <EntryDialog
          kind={editing.kind}
          initial={editing.row}
          isNew={editing.index === null}
          onSave={save}
          onDelete={editing.index === null ? undefined : remove}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
