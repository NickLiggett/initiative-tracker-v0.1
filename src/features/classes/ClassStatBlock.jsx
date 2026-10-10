import { useEffect, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { getClass, searchClasses } from "../../api/classes";
import Description from "../../components/Description";
import { Section, SourceChip, StatTile } from "../../components/resource/StatBlockParts";
import LevelTable from "./LevelTable";
import { casterLabel, hitDie, levelsText, names } from "./classFormat";
import { classAbilities, levelTable, textOf } from "./classTable";

/**
 * A class or subclass laid out like a stat block: its facts, hit points, proficiencies and equipment, the level table and
 * its features by level. A class lists its subclasses and a subclass names its class; each opens when chosen.
 *
 * @param {object} cls
 * @param {(cls: object) => void} [open] shows another class or subclass, for those links
 */
export default function ClassStatBlock({ cls, open }) {
  const { parent, subclasses } = useRelatives(cls);
  const table = levelTable(cls);
  const abilities = classAbilities(cls);
  const facts = [
    ["Hit die", hitDie(cls)],
    ["Saving throws", names(cls.savingThrows)],
    ["Primary ability", names(cls.primaryAbilities)],
    ["Spellcasting", casterLabel(cls.casterType)],
  ].filter(([, value]) => value);
  const blocks = [
    ["Core traits", textOf(cls, "CORE_TRAITS_TABLE")],
    ["Proficiencies", textOf(cls, "PROFICIENCIES")],
    ["Starting equipment", textOf(cls, "STARTING_EQUIPMENT")],
  ].filter(([, text]) => text);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {cls.name}
        </Typography>
        {cls.subclassOf && (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            Subclass of{" "}
            {parent && open ? (
              <Chip size="small" clickable variant="outlined" label={parent.name} onClick={() => open(parent)} aria-label={`Open ${parent.name}`} />
            ) : (
              cls.subclassOf.name
            )}
          </Typography>
        )}
        <SourceChip document={cls.document} />
      </Box>

      {facts.length > 0 && (
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", mb: 2 }}>
          {facts.map(([label, value]) => (
            <StatTile key={label} label={label}>
              {value}
            </StatTile>
          ))}
        </Box>
      )}

      {cls.desc?.trim() && (
        <Box sx={{ mb: 2 }}>
          <Description text={cls.desc} />
        </Box>
      )}

      {cls.hitPoints?.hitPointsAt1stLevel && (
        <Typography sx={{ mb: 0.5 }}>
          <strong>Hit points at 1st level</strong> {cls.hitPoints.hitPointsAt1stLevel}
        </Typography>
      )}
      {cls.hitPoints?.hitPointsAtHigherLevels && (
        <Typography sx={{ mb: 2 }}>
          <strong>Hit points at higher levels</strong> {cls.hitPoints.hitPointsAtHigherLevels}
        </Typography>
      )}

      {subclasses.length > 0 && (
        <Section title="Subclasses">
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }} aria-label="Subclasses">
            {subclasses.map((subclass) => (
              <Chip
                key={subclass.key}
                label={subclass.name}
                variant="outlined"
                clickable={Boolean(open)}
                onClick={open ? () => open(subclass) : undefined}
                aria-label={open ? `Open ${subclass.name}` : undefined}
              />
            ))}
          </Box>
        </Section>
      )}

      {blocks.map(([title, text]) => (
        <Section key={title} title={title}>
          <Description text={text} />
        </Section>
      ))}

      {table && (
        <Section title="Class table">
          <LevelTable table={table} />
        </Section>
      )}

      <Section title={cls.subclassOf ? "Features" : "Class features"}>
        {abilities.length === 0 ? (
          <Typography color="text.secondary">No features.</Typography>
        ) : (
          abilities.map((ability) => (
            <Box key={ability.key ?? ability.name} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>{ability.name}</Typography>
              {ability.levels.length > 0 && (
                <Typography variant="caption" color="text.secondary" component="div">
                  {levelsText(ability.levels)}
                </Typography>
              )}
              <Description text={ability.desc} />
            </Box>
          ))
        )}
      </Section>
    </Box>
  );
}

/** The class this one is a subclass of, or its subclasses. Whatever can't be loaded is left out. */
function useRelatives(cls) {
  const [relatives, setRelatives] = useState({ key: null, parent: null, subclasses: [] });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const lookups = [
      cls.subclassOf?.key ? getClass(cls.subclassOf.key, { signal }) : Promise.resolve(null),
      !cls.subclassOf && cls.key ? searchClasses("", { subclassOf: cls.key, pageSize: 100, signal }) : Promise.resolve([]),
    ];
    Promise.all(lookups.map((lookup) => lookup.catch(() => null))).then(([parent, subclasses]) => {
      if (!signal.aborted) {
        setRelatives({ key: cls.key, parent, subclasses: subclasses ?? [] });
      }
    });
    return () => controller.abort();
  }, [cls.key, cls.subclassOf?.key]);

  // What was found for another class, while this one is still being looked up, isn't this one's.
  return relatives.key === cls.key ? relatives : { parent: null, subclasses: [] };
}
