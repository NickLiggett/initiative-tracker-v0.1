import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import FormSection from "../../components/resource/FormSection";
import { capitalizeFirstLetter } from "../../utils/text";
import { ARMOR_CATEGORIES, COINS, WEAPON_CLASSES, armorClassText, blankArmor, blankWeapon, newProperty } from "./itemDraft";
import { itemKindName } from "./itemFormat";

const pairStyles = { display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" };

/**
 * The fields of an item draft. `onChange` is given the new draft. `references` has the backend's item categories,
 * rarities, damage types and weapon properties to choose from.
 */
export default function ItemForm({ draft, onChange, references }) {
  const { categories, rarities, damageTypes, weaponProperties } = references;
  const set = (changes) => onChange({ ...draft, ...changes });
  const setWeapon = (changes) => set({ weapon: { ...draft.weapon, ...changes } });
  const setArmor = (changes) => set({ armor: { ...draft.armor, ...changes } });

  // Choosing a weapon or armor category switches on the details that go with it.
  const chooseCategory = (category) =>
    set({
      category,
      ...(category?.key === "weapon" && !draft.weapon && { weapon: blankWeapon() }),
      ...(category?.key === "armor" && !draft.armor && { armor: blankArmor() }),
    });

  return (
    <Box component="form" aria-label="Item details" noValidate onSubmit={(event) => event.preventDefault()} sx={{ display: "grid", gap: 2 }}>
      <FormSection title="Basics">
        {draft.base ? (
          <Typography color="text.secondary">
            {itemKindName({ ...(draft.kind === "magic" && { rarity: null }) })} (the kind can't be changed once it's made)
          </Typography>
        ) : (
          <ToggleButtonGroup
            exclusive
            size="small"
            aria-label="Kind"
            value={draft.kind}
            onChange={(event, kind) => kind !== null && set({ kind })}
          >
            <ToggleButton value="item" sx={{ textTransform: "none" }}>
              Item
            </ToggleButton>
            <ToggleButton value="magic" sx={{ textTransform: "none" }}>
              Magic item
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <TextField label="Item name" required value={draft.name} onChange={(event) => set({ name: event.target.value })} />
        <ReferenceSelect label="Category" options={categories} value={draft.category} onChange={chooseCategory} />
        <TextField
          label="Description"
          multiline
          minRows={4}
          value={draft.desc}
          onChange={(event) => set({ desc: event.target.value })}
          helperText="**bold**, *italic*, lines starting with “- ”, and | tables | are understood"
        />
      </FormSection>

      <FormSection title="Cost and weight">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "2fr 1fr 2fr" }}>
          <TextField
            label="Cost"
            value={draft.costAmount}
            onChange={(event) => set({ costAmount: decimal(event.target.value) })}
            inputProps={{ inputMode: "decimal" }}
          />
          <TextField
            select
            SelectProps={{ native: true }}
            label="Coin"
            value={draft.costCoin}
            onChange={(event) => set({ costCoin: event.target.value })}
          >
            {COINS.map(({ value }) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TextField>
          <TextField
            label="Weight (lb)"
            value={draft.weight}
            onChange={(event) => set({ weight: decimal(event.target.value) })}
            inputProps={{ inputMode: "decimal" }}
          />
        </Box>
      </FormSection>

      {draft.kind === "magic" && (
        <FormSection title="Magic">
          <ReferenceSelect label="Rarity" required options={rarities} value={draft.rarity} onChange={(rarity) => set({ rarity })} />
          <FormControlLabel
            label="Requires attunement"
            control={
              <Checkbox checked={draft.requiresAttunement} onChange={(event) => set({ requiresAttunement: event.target.checked })} />
            }
          />
          {draft.requiresAttunement && (
            <TextField
              label="Attunement detail"
              value={draft.attunementDetail}
              onChange={(event) => set({ attunementDetail: event.target.value })}
              helperText="Who can attune, e.g. “requires attunement by a wizard”"
            />
          )}
        </FormSection>
      )}

      <FormSection title="Weapon">
        <FormControlLabel
          label="This item is a weapon"
          control={
            <Switch checked={draft.weapon !== null} onChange={(event) => set({ weapon: event.target.checked ? blankWeapon() : null })} />
          }
        />
        {draft.weapon && (
          <>
            <Box sx={pairStyles}>
              <TextField
                label="Damage dice"
                value={draft.weapon.dice}
                onChange={(event) => setWeapon({ dice: event.target.value })}
                helperText="e.g. 1d8"
              />
              <ReferenceSelect
                label="Damage type"
                options={damageTypes}
                value={draft.weapon.damageType}
                onChange={(damageType) => setWeapon({ damageType })}
              />
            </Box>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Weapon class"
              value={draft.weapon.weaponClass}
              onChange={(event) => setWeapon({ weaponClass: event.target.value })}
            >
              {WEAPON_CLASSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </TextField>
            <PropertyPicker
              properties={draft.weapon.properties}
              options={weaponProperties}
              onChange={(properties) => setWeapon({ properties })}
            />
          </>
        )}
      </FormSection>

      <FormSection title="Armor">
        <FormControlLabel
          label="This item is armor"
          control={<Switch checked={draft.armor !== null} onChange={(event) => set({ armor: event.target.checked ? blankArmor() : null })} />}
        />
        {draft.armor && (
          <>
            <Box sx={pairStyles}>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Armor type"
                value={draft.armor.category}
                onChange={(event) => setArmor({ category: event.target.value })}
              >
                {ARMOR_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {capitalizeFirstLetter(category)}
                  </option>
                ))}
              </TextField>
              <TextField
                label="Armor class"
                required
                value={draft.armor.acBase}
                onChange={(event) => setArmor({ acBase: digits(event.target.value) })}
                inputProps={{ inputMode: "numeric" }}
                helperText={armorClassText(draft.armor) ? `Shown as ${armorClassText(draft.armor)}` : undefined}
              />
            </Box>
            <FormControlLabel
              label="Add Dexterity modifier"
              control={<Checkbox checked={draft.armor.addDex} onChange={(event) => setArmor({ addDex: event.target.checked })} />}
            />
            {draft.armor.addDex && (
              <TextField
                label="Max Dexterity bonus"
                value={draft.armor.capDex}
                onChange={(event) => setArmor({ capDex: digits(event.target.value) })}
                inputProps={{ inputMode: "numeric" }}
                helperText="Leave empty for no limit"
              />
            )}
            <TextField
              label="Strength required"
              value={draft.armor.strength}
              onChange={(event) => setArmor({ strength: digits(event.target.value) })}
              inputProps={{ inputMode: "numeric" }}
            />
            <FormControlLabel
              label="Disadvantage on Stealth checks"
              control={<Checkbox checked={draft.armor.stealth} onChange={(event) => setArmor({ stealth: event.target.checked })} />}
            />
          </>
        )}
      </FormSection>
    </Box>
  );
}

/** Adds weapon properties from the source's list, and lets each have its own detail (e.g. Versatile 1d10). */
function PropertyPicker({ properties, options, onChange }) {
  const sorted = [...options].sort(
    (a, b) => Number(a.type === "Mastery") - Number(b.type === "Mastery") || a.name.localeCompare(b.name),
  );
  const update = (id, detail) => onChange(properties.map((property) => (property.id === id ? { ...property, detail } : property)));
  const add = (option) => {
    const already = properties.some((property) => property.name === option.name && property.type === (option.type ?? null));
    if (option && !already) {
      onChange([...properties, newProperty(option)]);
    }
  };

  return (
    <Box role="group" aria-label="Properties" sx={{ display: "grid", gap: 1 }}>
      <Autocomplete
        size="small"
        value={null}
        options={sorted}
        groupBy={(option) => (option.type === "Mastery" ? "Masteries" : "Properties")}
        getOptionLabel={(option) => `${option.name} (${option.document?.displayName ?? "custom"})`}
        onChange={(event, option) => option && add(option)}
        renderInput={(params) => <TextField {...params} label="Add a property" />}
      />
      {properties.map((property) => (
        <Box key={property.id} role="group" aria-label={`${property.name}${property.type === "Mastery" ? " mastery" : ""}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: "bold", minWidth: 120 }}>
            {property.name}
            {property.type === "Mastery" && (
              <Typography component="span" variant="caption" color="text.secondary">
                {" "}
                (mastery)
              </Typography>
            )}
          </Typography>
          <TextField
            size="small"
            label="Detail"
            value={property.detail}
            onChange={(event) => update(property.id, event.target.value)}
            helperText="e.g. 1d10, or Range 80/320"
            sx={{ flex: 1 }}
          />
          <Tooltip title="Remove">
            <IconButton aria-label={`Remove ${property.name}`} onClick={() => onChange(properties.filter((candidate) => candidate.id !== property.id))}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
}

/** Picks one of `{key, name}` options, or none; the value is the option itself. */
function ReferenceSelect({ label, options, value, onChange, required = false }) {
  return (
    <TextField
      select
      required={required}
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }} // "None" is an empty value, which would leave the label over it
      label={label}
      value={value?.key ?? ""}
      onChange={(event) => {
        const option = options.find((candidate) => candidate.key === event.target.value);
        onChange(option ? { ...(option.rank !== undefined && { rank: option.rank }), key: option.key, name: option.name } : null);
      }}
    >
      <option value="">None</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.name}
        </option>
      ))}
    </TextField>
  );
}

/** Digits only. */
const digits = (value) => value.replace(/\D/g, "");

/** A number with at most one decimal point. */
const decimal = (value) => value.replace(/[^\d.]/g, "").replace(/^(\d*\.\d*).*$/, "$1");
