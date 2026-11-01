import { useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, CircularProgress, Paper, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { classesApi } from "../../api/classes";
import { speciesApi } from "../../api/species";

/** The classes of a character, each with its level: a character with no list of classes has the one in `classKey`. */
function classesOf(player) {
  if (player.classes?.length) {
    return player.classes.map(({ classKey, className, level, subclassKey, subclassName }) => ({ key: classKey, name: className, level, subclassKey, subclassName }));
  }
  return player.classKey ? [{ key: player.classKey, name: player.className, level: player.level }] : [];
}

/** The features a class gives up to a level, as `{name, desc, level}` in the order they are gained. */
export function classFeaturesUpTo(cls, level) {
  return (cls?.features ?? [])
    .filter((feature) => feature.featureType === "CLASS_LEVEL_FEATURE" || !feature.featureType)
    .map((feature) => ({ name: feature.name, desc: feature.desc, level: Math.min(...(feature.gainedAt ?? []).map((gained) => gained.level).filter(Number.isInteger)) }))
    .filter((feature) => Number.isFinite(feature.level) && feature.level <= level)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** The traits of a species, as `{name, desc}` in their order; its size and speed are on the sheet already. */
export function speciesTraits(species) {
  return (species?.traits ?? [])
    .filter((trait) => trait.type !== "SIZE" && trait.type !== "SPEED")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ name, desc }) => ({ name, desc }));
}

/** A class's group: its features up to the level, and those of its subclass if it has one that can be found, in the order gained. */
async function classGroup(one, signal) {
  const [cls, subclass] = await Promise.all([
    classesApi.get(one.key, { signal }),
    one.subclassKey ? classesApi.get(one.subclassKey, { signal }).catch((e) => (e.name === "AbortError" ? Promise.reject(e) : null)) : null,
  ]);
  const name = one.name ?? cls.name;
  const features = [
    ...classFeaturesUpTo(cls, one.level).map((feature) => ({ ...feature, from: `${name} ${feature.level}` })),
    ...classFeaturesUpTo(subclass, one.level).map((feature) => ({ ...feature, from: `${subclass.name} ${feature.level}` })),
  ].sort((a, b) => a.level - b.level);
  return { title: `${name}${subclass ? ` (${subclass.name})` : ""}, level ${one.level}`, features };
}

/**
 * The features and traits that come from a character's classes and subclasses (up to their level in each) and species, read from the
 * rules data as it is now, so that a level gained brings its features and a change to the class shows. They can't be
 * changed here; the character's own features are kept beside them.
 *
 * @param {object} player
 */
export default function RuleFeatures({ player }) {
  const [groups, setGroups] = useState(null); // [{title, features}]
  const [failed, setFailed] = useState(false);
  const classes = classesOf(player);
  const wanted = JSON.stringify([classes.map((one) => [one.key, one.name, one.level, one.subclassKey]), player.speciesKey, player.speciesName]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setFailed(false);
    const wantedClasses = classesOf(player).filter((one) => one.key);
    Promise.all([
      Promise.all(wantedClasses.map((one) => classGroup(one, signal))),
      player.speciesKey ? speciesApi.get(player.speciesKey, { signal }).then((species) => ({ title: player.speciesName ?? species.name, features: speciesTraits(species).map((trait) => ({ ...trait, from: player.speciesName ?? species.name })) })) : null,
    ])
      .then(([fromClasses, fromSpecies]) => setGroups([...fromClasses, ...(fromSpecies ? [fromSpecies] : [])].filter((group) => group.features.length)))
      .catch((e) => e.name !== "AbortError" && setFailed(true));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `wanted` stands for the parts of the character this reads
  }, [wanted]);

  if (failed) {
    return <Typography color="text.secondary">Couldn't load the class and species features.</Typography>;
  }
  if (!classes.some((one) => one.key) && !player.speciesKey) {
    return null; // a class or species typed by hand has no rules data
  }
  if (!groups) {
    return <CircularProgress size={20} aria-label="Loading class and species features" />;
  }
  if (groups.length === 0) {
    return null;
  }
  return (
    <Paper variant="outlined" component="section" aria-label="Class and species features" sx={{ p: 2, display: "grid", gap: 1.5 }}>
      <Typography variant="subtitle2" component="h2">
        From your class and species
      </Typography>
      {groups.map((group) => (
        <Box key={group.title}>
          <Typography variant="overline" color="text.secondary">
            {group.title}
          </Typography>
          {group.features.map((feature) => (
            <Accordion key={`${feature.from}:${feature.name}`} disableGutters variant="outlined" slotProps={{ transition: { unmountOnExit: true } }}>
              <AccordionSummary expandIcon={<ExpandMore />} aria-label={feature.name}>
                <Typography sx={{ flex: 1 }}>{feature.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 1 }}>
                  {feature.from}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                  {feature.desc || "No description."}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
    </Paper>
  );
}
