import { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { Add, CompareArrows, ContentCopy } from "@mui/icons-material";
import { copyCreature } from "../../api/creatures";
import CreatureComparison from "./CreatureComparison";
import CreatureEditor from "./CreatureEditor";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";

/** Search for a creature and read its stat block, compare it with another, or make a new one. */
export default function CreaturesPage() {
  const [creature, setCreature] = useState(null);
  const [other, setOther] = useState(null);
  const [comparing, setComparing] = useState(false);
  // While set, the editor is showing: { creature } is the one being changed, or null for a new creature.
  const [editing, setEditing] = useState(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState(null);

  const stopComparing = () => {
    setComparing(false);
    setOther(null);
  };

  const duplicate = async () => {
    setCopying(true);
    setError(null);
    try {
      setEditing({ creature: await copyCreature(creature.key) });
      stopComparing();
    } catch (e) {
      setError(`Couldn't duplicate ${creature.name}: ${e.message}`);
    } finally {
      setCopying(false);
    }
  };

  const saved = (savedCreature) => {
    setCreature(savedCreature);
    setEditing(null);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1400, p: 2, boxSizing: "border-box" }}>
      {editing ? (
        <CreatureEditor
          key={editing.creature?.key ?? "new"}
          creature={editing.creature}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1 }}>
              <CreatureSearch value={creature} onChange={setCreature} fullWidth />
            </Box>
            {comparing && (
              <Box sx={{ flex: 1 }}>
                <CreatureSearch label="Compare with" value={other} onChange={setOther} fullWidth />
              </Box>
            )}
            {comparing ? (
              <Button onClick={stopComparing}>Stop comparing</Button>
            ) : (
              <>
                <Button startIcon={<CompareArrows />} disabled={!creature} onClick={() => setComparing(true)}>
                  Compare
                </Button>
                <Button startIcon={<ContentCopy />} disabled={!creature || copying} onClick={duplicate}>
                  Duplicate
                </Button>
              </>
            )}
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ creature: null })}>
              New creature
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {creature && other ? (
            <CreatureComparison creatures={[creature, other]} />
          ) : creature ? (
            <>
              {comparing && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Choose a second creature to compare with.
                </Typography>
              )}
              <CreatureStatBlock creature={creature} />
            </>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
              Search for a creature to see its stat block.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
