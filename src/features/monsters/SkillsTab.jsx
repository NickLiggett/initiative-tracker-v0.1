import { Typography } from "@mui/material";
import { capitalizeFirstLetter } from "../../utils/text";
import { ABILITIES, abilityModifier, bonusList, formatModifier } from "./creatureFormat";
import { InfoRow, SectionHeading, TabPanel } from "./TabPanel";

const SENSES = [
  ["darkvisionRange", "Darkvision"],
  ["blindsightRange", "Blindsight"],
  ["tremorsenseRange", "Tremorsense"],
  ["truesightRange", "Truesight"],
];

export default function SkillsTab({ value, index, creature }) {
  const scores = creature.abilityScores ?? {};
  const modifiers = creature.modifiers ?? {};
  const savingThrows = bonusList(creature.savingThrows);
  const skills = bonusList(creature.skillBonuses);
  const traits = creature.traits ?? [];

  return (
    <TabPanel value={value} index={index}>
      {ABILITIES.map((ability) => (
        <InfoRow key={ability} label={`${capitalizeFirstLetter(ability)}:`}>
          {scores[ability] ?? "—"} ({formatModifier(modifiers[ability] ?? abilityModifier(scores[ability] ?? 10))})
        </InfoRow>
      ))}

      <InfoRow label="Proficiency Bonus:">
        {creature.proficiencyBonus == null ? "—" : formatModifier(creature.proficiencyBonus)}
      </InfoRow>

      {(savingThrows.length > 0 || skills.length > 0) && (
        <div>
          <SectionHeading>Proficiencies:</SectionHeading>
          {savingThrows.length > 0 && (
            <Typography>Saving Throws: {savingThrows.map(([name, bonus]) => `${name} ${bonus}`).join(", ")}</Typography>
          )}
          {skills.length > 0 && (
            <Typography>Skills: {skills.map(([name, bonus]) => `${name} ${bonus}`).join(", ")}</Typography>
          )}
        </div>
      )}

      <SectionHeading>Senses:</SectionHeading>
      <Typography>Passive Perception: {creature.passivePerception ?? "—"}</Typography>
      {SENSES.filter(([field]) => creature[field]).map(([field, label]) => (
        <Typography key={field}>
          {label}: {creature[field]} ft.
        </Typography>
      ))}

      {traits.length > 0 && (
        <div>
          <SectionHeading>Special Abilities:</SectionHeading>
          {traits.map((trait) => (
            <div key={trait.name}>
              <Typography style={{ fontWeight: "bolder", marginTop: 15 }}>{trait.name}</Typography>
              <Typography style={{ whiteSpace: "pre-line" }}>{trait.desc}</Typography>
            </div>
          ))}
        </div>
      )}
    </TabPanel>
  );
}
