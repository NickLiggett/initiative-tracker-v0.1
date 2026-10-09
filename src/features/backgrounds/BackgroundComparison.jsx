import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import ComparisonTable from "../../components/resource/ComparisonTable";
import { BackgroundBenefit } from "./BackgroundStatBlock";
import { compareBackgrounds, longBenefits } from "./compareBackgrounds";

/**
 * Two backgrounds side by side: a table of what each gives in the short kinds (ability scores, skills, tools, languages,
 * equipment), then each one's description, features and longer text in full.
 */
export default function BackgroundComparison({ backgrounds }) {
  const [first, second] = backgrounds;

  return (
    <Box>
      <ComparisonTable resources={backgrounds} sections={compareBackgrounds(first, second)} />

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
        {backgrounds.map((background, index) => (
          <Box key={`${index}:${background.key}`}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
              {background.name}
            </Typography>
            {background.desc?.trim() && (
              <Box sx={{ mb: 1 }}>
                <Description text={background.desc} />
              </Box>
            )}
            {longBenefits(background).map((benefit, position) => (
              <BackgroundBenefit key={`${benefit.name}-${position}`} benefit={benefit} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
