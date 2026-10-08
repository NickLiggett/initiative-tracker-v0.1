import { useEffect, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { getSpecies, searchSpecies } from "../../api/species";
import Description from "../../components/Description";
import { Section, SourceChip } from "../../components/resource/StatBlockParts";
import { traitBody } from "./speciesFormat";

/**
 * A species laid out like a stat block: its source, what it is (or which species it is a subspecies of), its description
 * and its traits. A species also lists its subspecies, found when it is shown; if they can't be, it is shown without.
 */
export default function SpeciesStatBlock({ species }) {
  const { parent, subspecies } = useRelatives(species);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {species.name}
        </Typography>
        {species.isSubspecies && (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            {parent ? `Subspecies of ${parent.name}` : "Subspecies"}
          </Typography>
        )}
        <SourceChip document={species.document} />
      </Box>

      {species.desc?.trim() && (
        <Box sx={{ mb: 2 }}>
          <Description text={species.desc} />
        </Box>
      )}

      {subspecies.length > 0 && (
        <Section title="Subspecies">
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }} aria-label="Subspecies">
            {subspecies.map((one) => (
              <Chip key={one.key} label={one.name} variant="outlined" />
            ))}
          </Box>
        </Section>
      )}

      <Section title="Traits">
        {(species.traits ?? []).length === 0 ? (
          <Typography color="text.secondary">No traits.</Typography>
        ) : (
          species.traits.map((trait, index) => (
            <Box key={`${trait.name}-${index}`} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>{trait.name}</Typography>
              <Description text={traitBody(trait)} />
            </Box>
          ))
        )}
      </Section>
    </Box>
  );
}

/** The species this one is a subspecies of, or its subspecies. Whatever can't be loaded is left out. */
function useRelatives(species) {
  const [relatives, setRelatives] = useState({ key: null, parent: null, subspecies: [] });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const lookups = [
      species.isSubspecies && species.subspeciesOfKey ? getSpecies(species.subspeciesOfKey, { signal }) : Promise.resolve(null),
      !species.isSubspecies && species.key ? searchSpecies("", { subspeciesOf: species.key, pageSize: 50, signal }) : Promise.resolve([]),
    ];
    Promise.all(lookups.map((lookup) => lookup.catch(() => null)))
      .then(([parent, subspecies]) => {
        if (!signal.aborted) {
          setRelatives({ key: species.key, parent, subspecies: subspecies ?? [] });
        }
      });
    return () => controller.abort();
  }, [species.key, species.isSubspecies, species.subspeciesOfKey]);

  // What was found for another species, while this one is still being looked up, isn't this one's.
  return relatives.key === species.key ? relatives : { parent: null, subspecies: [] };
}
