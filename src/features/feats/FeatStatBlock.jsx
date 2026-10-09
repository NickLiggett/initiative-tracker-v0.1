import { Box, Typography } from "@mui/material";
import Description from "../../components/Description";
import { Section, SourceChip } from "../../components/resource/StatBlockParts";
import { featTypeLabel } from "./featFormat";

/** A feat laid out like a stat block: what kind it is, its prerequisite, its source, its description and benefits. */
export default function FeatStatBlock({ feat }) {
  const benefits = feat.benefits ?? [];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {feat.name}
        </Typography>
        {feat.type && (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            {featTypeLabel(feat.type)} feat
          </Typography>
        )}
        {feat.prerequisite?.trim() && (
          <Typography sx={{ mt: 0.5 }}>
            <strong>Prerequisite:</strong> {feat.prerequisite}
          </Typography>
        )}
        <SourceChip document={feat.document} />
      </Box>

      {feat.desc?.trim() && (
        <Box sx={{ mb: 2 }}>
          <Description text={feat.desc} />
        </Box>
      )}

      <Section title="Benefits">
        {benefits.length === 0 ? (
          <Typography color="text.secondary">No benefits.</Typography>
        ) : (
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {benefits.map((benefit, index) => (
              <Box component="li" key={index} sx={{ mb: 1 }}>
                {benefit.name && <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>{benefit.name}</Typography>}
                <Description text={benefit.desc} />
              </Box>
            ))}
          </Box>
        )}
      </Section>
    </Box>
  );
}
