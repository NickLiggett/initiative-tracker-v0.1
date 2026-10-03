import { useState } from "react";
import { Box, Typography } from "@mui/material";
import CreatureSearch from "./CreatureSearch";
import CreatureStatBlock from "./CreatureStatBlock";

/** Search for a creature and read its stat block. */
export default function CreaturesPage() {
  const [creature, setCreature] = useState(null);

  return (
    <Box sx={{ width: "100%", maxWidth: 1100, p: 2, boxSizing: "border-box" }}>
      <CreatureSearch value={creature} onChange={setCreature} fullWidth />
      {creature ? (
        <CreatureStatBlock creature={creature} />
      ) : (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
          Search for a creature to see its stat block.
        </Typography>
      )}
    </Box>
  );
}
