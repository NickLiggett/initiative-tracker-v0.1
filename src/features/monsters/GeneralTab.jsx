import { capitalizeFirstLetter, capitalizeWords } from "../../utils/text";
import { formatChallengeRating, formatSpeed, immunityText } from "./creatureFormat";
import { InfoBlock, InfoRow, TabPanel } from "./TabPanel";

export default function GeneralTab({ value, index, creature }) {
  const resistances = creature.resistancesAndImmunities ?? {};
  const conditionImmunities = immunityText(resistances.conditionImmunitiesDisplay, resistances.conditionImmunities);
  const damageImmunities = immunityText(resistances.damageImmunitiesDisplay, resistances.damageImmunities);
  const damageResistances = immunityText(resistances.damageResistancesDisplay, resistances.damageResistances);
  const damageVulnerabilities = immunityText(
    resistances.damageVulnerabilitiesDisplay,
    resistances.damageVulnerabilities,
  );

  return (
    <TabPanel value={value} index={index}>
      <InfoRow label="Hit Points:">{creature.hitPoints ?? "—"}</InfoRow>
      <InfoRow label="Armor Class:">
        {creature.armorClass ?? "—"}
        {creature.armorDetail && ` (${creature.armorDetail})`}
      </InfoRow>
      <InfoRow label="Challenge Rating:">{formatChallengeRating(creature.challengeRating)}</InfoRow>
      <InfoRow label="Speed:">{formatSpeed(creature.speed)}</InfoRow>
      <InfoRow label="Hit Dice:">{creature.hitDice || "—"}</InfoRow>
      <InfoRow label="Type:">{creature.type?.name ?? "—"}</InfoRow>
      {creature.subcategory && <InfoRow label="Sub-Type:">{capitalizeFirstLetter(creature.subcategory)}</InfoRow>}
      <InfoRow label="Size:">{creature.size?.name ?? "—"}</InfoRow>
      <InfoRow label="Alignment:">{capitalizeWords(creature.alignment) || "—"}</InfoRow>
      <InfoBlock label="Languages:">{capitalizeFirstLetter(creature.languages?.asString) || "None"}</InfoBlock>
      {conditionImmunities && <InfoBlock label="Condition Immunities:">{conditionImmunities}</InfoBlock>}
      {damageImmunities && <InfoBlock label="Damage Immunities:">{damageImmunities}</InfoBlock>}
      {damageResistances && <InfoBlock label="Damage Resistances:">{damageResistances}</InfoBlock>}
      {damageVulnerabilities && <InfoBlock label="Damage Vulnerabilities:">{damageVulnerabilities}</InfoBlock>}
    </TabPanel>
  );
}
