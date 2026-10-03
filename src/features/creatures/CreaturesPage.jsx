import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { CompareArrows } from "@mui/icons-material";
import CreatureComparison from "./CreatureComparison";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";

/** Search for a creature and read its stat block, or compare it with another. */
export default function CreaturesPage() {
  const [creature, setCreature] = useState(null);
  const [other, setOther] = useState(null);
  const [comparing, setComparing] = useState(false);

  const stopComparing = () => {
    setComparing(false);
    setOther(null);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1100, p: 2, boxSizing: "border-box" }}>
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
          <Button startIcon={<CompareArrows />} disabled={!creature} onClick={() => setComparing(true)}>
            Compare
          </Button>
        )}
      </Box>

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
    </Box>
  );
}
