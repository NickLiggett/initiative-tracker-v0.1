import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import ComparisonTable from "../../components/resource/ComparisonTable";
import { Section } from "../../components/resource/StatBlockParts";
import { compareSpells, sameDescription } from "./compareSpells";

function Text({ spell }) {
  return (
    <>
      {spell.desc?.trim() ? <Description text={spell.desc} /> : <Typography color="text.secondary">No description.</Typography>}
      {spell.higherLevel?.trim() && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>At higher levels</Typography>
          <Description text={spell.higherLevel} />
        </Box>
      )}
    </>
  );
}

/** Two spells side by side: a table of their facts, then their descriptions. */
export default function SpellComparison({ spells }) {
  const [first, second] = spells;

  return (
    <Box>
      <ComparisonTable resources={spells} sections={compareSpells(first, second)} />

      {sameDescription(first, second) ? (
        <Box sx={{ mt: 3 }}>
          <Section title="Description">
            <Typography color="text.secondary" sx={{ fontStyle: "italic", mb: 1 }}>
              Both descriptions are the same.
            </Typography>
            <Text spell={first} />
          </Section>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
          {spells.map((spell, index) => (
            <Box key={`${index}:${spell.key}`}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
                {spell.name}
              </Typography>
              <Text spell={spell} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
