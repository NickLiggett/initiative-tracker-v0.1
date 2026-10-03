import { Box, Typography } from "@mui/material";
import ComparisonTable from "../../components/resource/ComparisonTable";
import { compareCreatures, sharedEntryNames } from "./compareCreatures";
import { CreatureAbilities } from "./CreatureStatBlock";

/** Two creatures side by side: a table of their numbers, then each one's traits and actions. */
export default function CreatureComparison({ creatures }) {
  const [first, second] = creatures;
  const sharedNames = sharedEntryNames(first, second);

  return (
    <Box>
      <ComparisonTable resources={creatures} sections={compareCreatures(first, second)} />

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
        {creatures.map((creature) => (
          <Box key={creature.key}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
              {creature.name}
            </Typography>
            <CreatureAbilities creature={creature} sharedNames={sharedNames} stacked />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
