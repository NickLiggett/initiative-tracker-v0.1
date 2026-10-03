import { Autocomplete, Box, Paper, TextField, Typography } from "@mui/material";
import { DEFENSES, SENSES, withDefenseItems } from "./creatureDraft";

/** The ranges of the creature's senses, in feet. `passivePerception` is worked out, and only shown. */
export function SensesEditor({ senses, passivePerception, onChange }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6" component="h3">
        Senses
      </Typography>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, 1fr)" }}>
        {SENSES.map(({ key, label }) => (
          <TextField
            key={key}
            label={`${label} (feet)`}
            value={senses[key]}
            onChange={(event) => onChange({ ...senses, [key]: event.target.value.replace(/\D/g, "") })}
            inputProps={{ inputMode: "numeric" }}
          />
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary">
        Passive Perception {passivePerception}, from the Perception bonus above.
      </Typography>
    </Paper>
  );
}

/**
 * Damage vulnerabilities, resistances and immunities, and condition immunities. Each is a list to pick from and the
 * text the stat block shows, which follows the list until it is changed by hand.
 * `damageTypes` and `conditions` are the backend's `{key, name}` options.
 */
export function DefensesEditor({ defenses, damageTypes, conditions, onChange }) {
  const options = { damageTypes, conditions };

  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6" component="h3">
        Defenses
      </Typography>
      {DEFENSES.map(({ field, label, of }) => {
        const defense = defenses[field];
        return (
          <Box key={field} role="group" aria-label={label} sx={{ display: "grid", gap: 1 }}>
            <Autocomplete
              multiple
              filterSelectedOptions
              size="small"
              options={options[of]}
              value={defense.items}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, selected) => option.key === selected.key}
              onChange={(event, items) =>
                onChange({
                  ...defenses,
                  [field]: withDefenseItems(
                    defense,
                    items.map(({ key, name }) => ({ key, name })),
                  ),
                })
              }
              renderInput={(params) => <TextField {...params} label={label} />}
            />
            <TextField
              size="small"
              label="Shown as"
              value={defense.display}
              onChange={(event) => onChange({ ...defenses, [field]: { ...defense, display: event.target.value } })}
              helperText={'Can say more than the list, e.g. “damage from nonmagical weapons”'}
            />
          </Box>
        );
      })}
    </Paper>
  );
}
