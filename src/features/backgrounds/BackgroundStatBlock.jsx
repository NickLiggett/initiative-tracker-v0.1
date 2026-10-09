import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import { Section, SourceChip } from "../../components/resource/StatBlockParts";
import { benefitTypeLabel } from "./backgroundFormat";

/** A background laid out like a stat block: its source, its description and what it gives a character. */
export default function BackgroundStatBlock({ background }) {
  const benefits = background.benefits ?? [];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {background.name}
        </Typography>
        <SourceChip document={background.document} />
      </Box>

      {background.desc?.trim() && (
        <Box sx={{ mb: 2 }}>
          <Description text={background.desc} />
        </Box>
      )}

      <Section title="Benefits">
        {benefits.length === 0 ? (
          <Typography color="text.secondary">No benefits.</Typography>
        ) : (
          benefits.map((benefit, index) => (
            <Box key={`${benefit.name}-${index}`} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>{benefit.name}</Typography>
              {benefit.type && benefitTypeLabel(benefit.type).toLowerCase() !== benefit.name?.trim().toLowerCase() && (
                <Typography variant="caption" color="text.secondary" component="div">
                  {benefitTypeLabel(benefit.type)}
                </Typography>
              )}
              <Description text={benefit.desc} />
            </Box>
          ))
        )}
      </Section>
    </Box>
  );
}
