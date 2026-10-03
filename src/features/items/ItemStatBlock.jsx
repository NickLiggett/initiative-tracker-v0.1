import { Box, Chip, Tooltip, Typography } from "@mui/material";
import Description from "../../components/Description";
import { Section, SourceChip, StatTile } from "../../components/resource/StatBlockParts";
import { capitalizeFirstLetter } from "../../utils/text";
import {
  attunementText,
  formatArmorClass,
  formatCost,
  formatDamage,
  formatWeight,
  isMagicItem,
  itemKindName,
  weaponClass,
  weaponProperties,
} from "./itemFormat";

const tilesStyles = { display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", mb: 2 };

/** Everything the backend knows about an item or magic item, laid out like a stat block. */
export default function ItemStatBlock({ item }) {
  const magic = isMagicItem(item);
  const attunement = attunementText(item);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          {item.name}
        </Typography>
        <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
          {[itemKindName(item), item.category?.name, magic && item.rarity?.name].filter(Boolean).join(" · ")}
        </Typography>
        {attunement && (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            {attunement}
          </Typography>
        )}
        <SourceChip document={item.document} />
      </Box>

      <Box sx={tilesStyles}>
        <StatTile label="Cost">{formatCost(item.cost)}</StatTile>
        <StatTile label="Weight">{formatWeight(item.weight, item.weightUnit)}</StatTile>
      </Box>

      {item.weapon && <WeaponSection weapon={item.weapon} item={item} />}
      {item.armor && <ArmorSection armor={item.armor} item={item} />}

      {item.desc?.trim() && (
        <Section title="Description">
          <Description text={item.desc} />
        </Section>
      )}
    </Box>
  );
}

/** "Weapon", or "Weapon: War Pick" when a magic item is built on an ordinary weapon. */
function sectionTitle(kind, stats, item) {
  return stats.name && stats.name !== item.name ? `${kind}: ${stats.name}` : kind;
}

function WeaponSection({ weapon, item }) {
  const { properties, masteries } = weaponProperties(weapon);

  return (
    <Section title={sectionTitle("Weapon", weapon, item)}>
      <Box sx={tilesStyles}>
        <StatTile label="Damage">{formatDamage(weapon)}</StatTile>
        {weaponClass(weapon) && <StatTile label="Class">{weaponClass(weapon)}</StatTile>}
      </Box>
      <PropertyChips title="Properties" properties={properties} />
      <PropertyChips title="Mastery" properties={masteries} />
    </Section>
  );
}

/** Chips for weapon properties; hovering one gives its rule. */
function PropertyChips({ title, properties }) {
  if (properties.length === 0) {
    return null;
  }
  return (
    <Box role="group" aria-label={title} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 1 }}>
      <Typography sx={{ fontWeight: "bold" }}>{title}</Typography>
      {properties.map((property) => (
        <Tooltip key={property.label} describeChild title={property.desc ?? ""}>
          <Chip size="small" variant="outlined" label={property.label} />
        </Tooltip>
      ))}
    </Box>
  );
}

function ArmorSection({ armor, item }) {
  return (
    <Section title={sectionTitle("Armor", armor, item)}>
      <Box sx={tilesStyles}>
        <StatTile label="Armor Class">{formatArmorClass(armor, item)}</StatTile>
        {armor.category && <StatTile label="Type">{capitalizeFirstLetter(armor.category)}</StatTile>}
        {armor.strengthScoreRequired > 0 && <StatTile label="Strength required">{armor.strengthScoreRequired}</StatTile>}
        {armor.grantsStealthDisadvantage && <StatTile label="Stealth">Disadvantage</StatTile>}
      </Box>
    </Section>
  );
}
