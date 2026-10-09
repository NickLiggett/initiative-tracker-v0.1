import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import ComparisonTable from "../../components/resource/ComparisonTable";
import { Section } from "../../components/resource/StatBlockParts";
import { compareFeats, sameContent } from "./compareFeats";
import { FeatBenefits } from "./FeatStatBlock";

function Text({ feat }) {
  return (
    <>
      {feat.desc?.trim() && (
        <Box sx={{ mb: 1 }}>
          <Description text={feat.desc} />
        </Box>
      )}
      <FeatBenefits feat={feat} />
    </>
  );
}

/** Two feats side by side: a table of their type and prerequisite, then what each gives. */
export default function FeatComparison({ feats }) {
  const [first, second] = feats;

  return (
    <Box>
      <ComparisonTable resources={feats} sections={compareFeats(first, second)} />

      {sameContent(first, second) ? (
        <Box sx={{ mt: 3 }}>
          <Section title="Benefits">
            <Typography color="text.secondary" sx={{ fontStyle: "italic", mb: 1 }}>
              Both feats give the same.
            </Typography>
            <Text feat={first} />
          </Section>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
          {feats.map((feat, index) => (
            <Box key={`${index}:${feat.key}`}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
                {feat.name}
              </Typography>
              <Text feat={feat} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
