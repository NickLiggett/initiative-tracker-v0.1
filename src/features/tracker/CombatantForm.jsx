import { Autocomplete, Checkbox, FormControl, TextField, Typography } from "@mui/material";
import { useState } from "react";
import MonsterSearch from "./MonsterSearch";

export const COMBATANT_TYPES = ["PC", "NPC", "Monster", "Other"];

const MAX_NAME_LENGTH = 25;
const MAX_DIGITS = { initiative: 2, armorClass: 2, hitPoints: 4 };

/** The empty form. */
export const EMPTY_COMBATANT = { name: "", initiative: "", armorClass: "", hitPoints: "", type: "", creature: null };

/**
 * The fields for adding a combatant. Monsters are picked from the backend's creatures.
 * @param {{form: object, errors: object, onChange: (changes: object) => void, nameInputRef: object}} props
 */
export default function CombatantForm({ form, errors, onChange, nameInputRef }) {
  const [typeInput, setTypeInput] = useState("");

  const changeDigits = (field) => (event) => {
    const input = event.target.value;
    if (input === "" || (/^\d+$/.test(input) && input.length <= MAX_DIGITS[field])) {
      onChange({ [field]: input });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div>
        <TextField
          id="name-text-field"
          label="Name"
          variant="outlined"
          size="small"
          value={form.name}
          onChange={(event) => event.target.value.length <= MAX_NAME_LENGTH && onChange({ name: event.target.value })}
          sx={{ m: 1 }}
          error={errors.name}
          inputRef={nameInputRef}
        />
        <TextField
          id="initiative-text-field"
          label="Initiative"
          variant="outlined"
          size="small"
          value={form.initiative}
          onChange={changeDigits("initiative")}
          sx={{ width: 90, m: 1 }}
          error={errors.initiative}
        />
        <TextField
          id="armor-class-text-field"
          label="AC"
          variant="outlined"
          size="small"
          value={form.armorClass}
          onChange={changeDigits("armorClass")}
          sx={{ width: 75, m: 1 }}
        />
        <TextField
          id="health-points-text-field"
          label="HP"
          variant="outlined"
          size="small"
          value={form.hitPoints}
          onChange={changeDigits("hitPoints")}
          sx={{ width: 75, m: 1 }}
        />
      </div>
      <div style={{ display: "flex" }}>
        <FormControl sx={{ width: 180, m: 1 }} size="small">
          <Autocomplete
            freeSolo
            disablePortal
            autoHighlight
            id="combatant-type"
            options={COMBATANT_TYPES}
            size="small"
            value={form.type}
            onChange={(event, type) => onChange({ type: type ?? "", creature: type === "Monster" ? form.creature : null })}
            inputValue={typeInput}
            onInputChange={(event, text) => setTypeInput(text)}
            renderInput={(params) => <TextField {...params} label="Type" error={errors.type} />}
          />
        </FormControl>
        {form.type === "Monster" && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <MonsterSearch value={form.creature} onChange={(creature) => onChange({ creature })} />
            <div style={{ display: "flex", alignItems: "center", marginLeft: 15 }}>
              <Typography>Mob:</Typography>
              <Checkbox />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
