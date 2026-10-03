import { Box, Chip, Paper, Typography } from "@mui/material";
import { Section, SourceChip, StatTile } from "../../components/resource/StatBlockParts";
import { capitalizeFirstLetter, capitalizeWords } from "../../utils/text";
import {
  ABILITY_ORDER,
  ACTION_TYPES,
  actionsOfType,
  bonusList,
  formatChallengeRating,
  formatExperience,
  formatModifier,
  formatSenses,
  formatSpeed,
  formatUsageLimits,
  immunityText,
  isLegendaryPreamble,
  proficiencyBonusFor,
} from "./creatureFormat";
import Description from "../../components/Description";

/** Everything the backend knows about a creature, laid out like a stat block. */
export default function CreatureStatBlock({ creature }) {
  return (
    <Box>
      <Header creature={creature} />
      <KeyStats creature={creature} />
      <AbilityScores creature={creature} />
      <Properties creature={creature} />
      <CreatureAbilities creature={creature} />
    </Box>
  );
}

/**
 * A creature's traits and its actions of each type. With `sharedNames` (lower-cased), entries whose name is in it
 * are tagged "shared"; `stacked` puts the traits above the actions instead of beside them.
 */
export function CreatureAbilities({ creature, sharedNames, stacked = false }) {
  const traits = creature.traits ?? [];
  const isShared = (name) => sharedNames?.has(name.toLowerCase()) ?? false;

  return (
    <Box
      sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: traits.length && !stacked ? "1fr 1fr" : "1fr" } }}
    >
      {traits.length > 0 && (
        <Section title="Traits">
          {traits.map((trait, position) => (
            <Entry key={`${trait.name}-${position}`} name={trait.name} desc={trait.desc} shared={isShared(trait.name)} />
          ))}
        </Section>
      )}
      <Box>
        {ACTION_TYPES.map(({ type, heading }) => (
          <ActionSection key={type} creature={creature} type={type} heading={heading} isShared={isShared} />
        ))}
      </Box>
    </Box>
  );
}

function Header({ creature }) {
  const { document } = creature;
  const kind = [creature.size?.name, creature.type?.name].filter(Boolean).join(" ");
  const subtitle = [kind, creature.subcategory && `(${creature.subcategory})`].filter(Boolean).join(" ");
  const alignment = capitalizeWords(creature.alignment);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
        {creature.name}
      </Typography>
      <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
        {[subtitle, alignment].filter(Boolean).join(", ")}
      </Typography>
      <SourceChip document={document} />
    </Box>
  );
}

function KeyStats({ creature }) {
  const proficiency = proficiencyBonusFor(creature);
  const armor = creature.armorClass == null ? "—" : `${creature.armorClass}${creature.armorDetail ? ` (${creature.armorDetail})` : ""}`;
  const hitPoints = creature.hitPoints == null ? "—" : `${creature.hitPoints}${creature.hitDice ? ` (${creature.hitDice})` : ""}`;

  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", mb: 2 }}>
      <StatTile label="Armor Class">{armor}</StatTile>
      <StatTile label="Hit Points">{hitPoints}</StatTile>
      <StatTile label="Speed">{formatSpeed(creature.speedAll ?? creature.speed)}</StatTile>
      <StatTile label="Initiative">
        {creature.initiativeBonus == null ? "—" : formatModifier(creature.initiativeBonus)}
      </StatTile>
      <StatTile label="Challenge">
        {formatChallengeRating(creature.challengeRating)}
        {creature.experiencePoints != null && ` (${formatExperience(creature.experiencePoints)})`}
      </StatTile>
      <StatTile label="Proficiency">{proficiency === null ? "—" : formatModifier(proficiency)}</StatTile>
    </Box>
  );
}

function AbilityScores({ creature }) {
  const scores = creature.abilityScores ?? {};
  const modifiers = creature.modifiers ?? {};
  const saves = creature.savingThrowsAll ?? creature.savingThrows ?? {};
  const proficientSaves = creature.savingThrows ?? {};

  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", mb: 2 }}>
      {ABILITY_ORDER.map(([ability, abbreviation]) => {
        const save = saves[ability] ?? modifiers[ability];
        return (
          <Paper key={ability} variant="outlined" sx={{ p: 1, textAlign: "center" }}>
            <Typography variant="caption" sx={{ fontWeight: "bold" }} aria-label={capitalizeFirstLetter(ability)}>
              {abbreviation}
            </Typography>
            <Typography variant="h6" component="div">
              {scores[ability] ?? "—"}
            </Typography>
            <Typography variant="body2">
              {modifiers[ability] == null ? "—" : formatModifier(modifiers[ability])}
            </Typography>
            <Typography
              variant="caption"
              color={proficientSaves[ability] == null ? "text.secondary" : "primary"}
              sx={{ fontWeight: proficientSaves[ability] == null ? "normal" : "bold" }}
            >
              Save {save == null ? "—" : formatModifier(save)}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}

function Properties({ creature }) {
  const resistances = creature.resistancesAndImmunities ?? {};
  const skills = bonusList(creature.skillBonuses).map(([name, bonus]) => `${name} ${bonus}`).join(", ");
  const environments = (creature.environments ?? []).map((environment) => environment.name ?? environment).join(", ");

  const rows = [
    ["Skills", skills],
    ["Senses", formatSenses(creature)],
    ["Languages", capitalizeFirstLetter(creature.languages?.asString) || "None"],
    ["Damage Vulnerabilities", immunityText(resistances.damageVulnerabilitiesDisplay, resistances.damageVulnerabilities)],
    ["Damage Resistances", immunityText(resistances.damageResistancesDisplay, resistances.damageResistances)],
    ["Damage Immunities", immunityText(resistances.damageImmunitiesDisplay, resistances.damageImmunities)],
    ["Condition Immunities", immunityText(resistances.conditionImmunitiesDisplay, resistances.conditionImmunities)],
    ["Environments", environments],
  ].filter(([, value]) => value);

  return (
    <Box sx={{ mb: 3 }}>
      {rows.map(([label, value]) => (
        <Typography key={label} sx={{ mb: 0.5 }}>
          <strong>{label}</strong> {capitalizeFirstLetter(value)}
        </Typography>
      ))}
    </Box>
  );
}

function ActionSection({ creature, type, heading, isShared }) {
  const actions = actionsOfType(creature, type);
  const preamble = actions.find(isLegendaryPreamble);
  const entries = actions.filter((action) => action !== preamble);
  if (entries.length === 0 && !preamble) {
    return null;
  }
  return (
    <Section title={heading}>
      {preamble && <Description text={preamble.desc ? `${preamble.name}. ${preamble.desc}` : preamble.name} />}
      {entries.map((action, position) => (
        <Entry
          key={`${action.name}-${position}`}
          name={action.name}
          notes={actionNotes(action)}
          desc={action.desc}
          shared={isShared?.(action.name)}
        />
      ))}
    </Section>
  );
}

/** "Recharge 5–6; costs 2 actions" */
function actionNotes(action) {
  const notes = [formatUsageLimits(action.usageLimits), action.limitedToForm];
  if (action.actionType === "LEGENDARY_ACTION" && action.legendaryActionCost > 1) {
    notes.push(`costs ${action.legendaryActionCost} actions`);
  }
  return notes.filter(Boolean).join("; ");
}

function Entry({ name, notes, desc, shared = false }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>
        {name}
        {notes && ` (${notes})`}
        {shared && <Chip label="shared" size="small" variant="outlined" sx={{ ml: 1, fontStyle: "normal" }} />}
      </Typography>
      <Description text={desc} />
    </Box>
  );
}
