import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import ComparisonTable from "../../components/resource/ComparisonTable";
import { Section } from "../../components/resource/StatBlockParts";
import { compareItems, sameDescription } from "./compareItems";

/** Two items side by side: a table of their facts, then their descriptions. */
export default function ItemComparison({ items }) {
  const [first, second] = items;

  return (
    <Box>
      <ComparisonTable resources={items} sections={compareItems(first, second)} />

      {sameDescription(first, second) ? (
        <Box sx={{ mt: 3 }}>
          <Section title="Description">
            <Typography color="text.secondary" sx={{ fontStyle: "italic", mb: 1 }}>
              Both descriptions are the same.
            </Typography>
            <Description text={first.desc} />
          </Section>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
          {items.map((item, index) => (
            <Box key={`${index}:${item.key}`}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
                {item.name}
              </Typography>
              {item.desc?.trim() ? (
                <Description text={item.desc} />
              ) : (
                <Typography color="text.secondary">No description.</Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
