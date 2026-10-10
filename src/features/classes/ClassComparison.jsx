import { Box, Typography } from "@mui/material";
import ComparisonTable from "../../components/resource/ComparisonTable";
import Description from "../../components/Description";
import { Section } from "../../components/resource/StatBlockParts";
import { compareClasses } from "./compareClasses";
import { textOf } from "./classTable";

/** Two classes side by side: a table of their hit die, saves and spellcasting, and what each gains at each level. */
export default function ClassComparison({ classes }) {
  const [first, second] = classes;
  const proficiencies = classes.map((cls) => textOf(cls, "PROFICIENCIES"));

  return (
    <Box>
      <ComparisonTable resources={classes} sections={compareClasses(first, second)} />
      {proficiencies.some(Boolean) && (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
          {classes.map((cls, index) => (
            <Box key={`${index}:${cls.key}`}>
              <Section title={`${cls.name}: proficiencies`}>
                {proficiencies[index] ? <Description text={proficiencies[index]} /> : <Typography color="text.secondary">None listed.</Typography>}
              </Section>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
