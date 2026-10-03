import { Box, Chip, Divider, Link, Paper, Typography } from "@mui/material";
import { capitalizeFirstLetter, capitalizeWords } from "../../utils/text";
import {
  ABILITY_ORDER,
  ACTION_TYPES,
  actionsOfType,
  bonusList,
  formatChallengeRating,
  formatExperience,
  formatModifier,
  formatSpeed,
  formatUsageLimits,
  immunityText,
  isLegendaryPreamble,
  proficiencyBonusFor,
} from "./creatureFormat";
import Description from "./Description";

const SENSES = [
  ["darkvisionRange", "Darkvision"],
  ["blindsightRange", "Blindsight"],
  ["tremorsenseRange", "Tremorsense"],
  ["truesightRange", "Truesight"],
];

/** Everything the backend knows about a creature, laid out like a stat block. */
export default function CreatureStatBlock({ creature }) {
  const traits = creature.traits ?? [];

  return (
    <Box>
      <Header creature={creature} />
      <KeyStats creature={creature} />
      <AbilityScores creature={creature} />
      <Properties creature={creature} />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: traits.length ? "1fr 1fr" : "1fr" } }}>
        {traits.length > 0 && (
          <Section title="Traits">
            {traits.map((trait, position) => (
              <Entry key={`${trait.name}-${position}`} name={trait.name} desc={trait.desc} />
            ))}
          </Section>
        )}
        <Box>
          {ACTION_TYPES.map(({ type, heading }) => (
            <ActionSection key={type} creature={creature} type={type} heading={heading} />
          ))}
        </Box>
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
      {document && (
        <Chip
          size="small"
          sx={{ mt: 1 }}
          label={document.displayName ?? document.name}
          {...(document.permalink && {
            component: "a",
            href: document.permalink,
            target: "_blank",
            rel: "noreferrer",
            clickable: true,
          })}
        />
      )}
      {document?.publisher?.name && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {[document.publisher.name, document.gamesystem?.name].filter(Boolean).join(" · ")}
        </Typography>
      )}
    </Box>
  );
}

function KeyStats({ creature }) {
  const proficiency = proficiencyBonusFor(creature);
  const armor = creature.armorClass == null ? "—" : `${creature.armorClass}${creature.armorDetail ? ` (${creature.armorDetail})` : ""}`;
  const hitPoints = creature.hitPoints == null ? "—" : `${creature.hitPoints}${creature.hitDice ? ` (${creature.hitDice})` : ""}`;

  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", mb: 2 }}>
      <Tile label="Armor Class">{armor}</Tile>
      <Tile label="Hit Points">{hitPoints}</Tile>
      <Tile label="Speed">{formatSpeed(creature.speedAll ?? creature.speed)}</Tile>
      <Tile label="Initiative">
        {creature.initiativeBonus == null ? "—" : formatModifier(creature.initiativeBonus)}
      </Tile>
      <Tile label="Challenge">
        {formatChallengeRating(creature.challengeRating)}
        {creature.experiencePoints != null && ` (${formatExperience(creature.experiencePoints)})`}
      </Tile>
      <Tile label="Proficiency">{proficiency === null ? "—" : formatModifier(proficiency)}</Tile>
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
  const senses = [
    creature.passivePerception != null && `Passive Perception ${creature.passivePerception}`,
    ...SENSES.filter(([field]) => creature[field]).map(([field, label]) => `${label} ${creature[field]} ft.`),
  ]
    .filter(Boolean)
    .join(", ");
  const environments = (creature.environments ?? []).map((environment) => environment.name ?? environment).join(", ");

  const rows = [
    ["Skills", skills],
    ["Senses", senses],
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

function ActionSection({ creature, type, heading }) {
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
        <Entry key={`${action.name}-${position}`} name={action.name} notes={actionNotes(action)} desc={action.desc} />
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

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" component="h3" sx={{ fontWeight: "bolder" }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}

function Entry({ name, notes, desc }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontWeight: "bold", fontStyle: "italic" }}>
        {name}
        {notes && ` (${notes})`}
      </Typography>
      <Description text={desc} />
    </Box>
  );
}

function Tile({ label, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Paper>
  );
}
