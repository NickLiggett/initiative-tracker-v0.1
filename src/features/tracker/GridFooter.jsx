import { useRef, useState } from "react";
import { Box, Button, ButtonGroup, useMediaQuery } from "@mui/material";
import CombatantForm, { EMPTY_COMBATANT } from "./CombatantForm";
import { applyChange } from "./creaturePrefill";

const NO_ERRORS = { name: false, initiative: false, type: false };

/**
 * The grid's footer: the form for adding combatants (Enter in a field submits it), and Submit / Characters (pick characters to
 * add) / Clear / Sort. Choosing a creature fills in the name, initiative, AC and HP the user hasn't typed.
 */
export default function GridFooter({ onAdd, onAddPlayers, onClear, onSort }) {
  const [form, setForm] = useState(EMPTY_COMBATANT);
  const [errors, setErrors] = useState(NO_ERRORS);
  const nameInputRef = useRef();
  const narrow = useMediaQuery("(max-width: 730px)");

  const handleSubmit = (event) => {
    event.preventDefault();
    const missing = { name: form.name === "", initiative: form.initiative === "", type: !form.type };
    if (missing.name || missing.initiative || missing.type) {
      setErrors(missing);
      return;
    }
    onAdd({
      initiative: parseInt(form.initiative, 10),
      name: form.name,
      ac: form.armorClass === "" ? "" : parseInt(form.armorClass, 10),
      hp: form.hitPoints === "" ? "" : parseInt(form.hitPoints, 10),
      reaction: false,
      type: form.type,
      creature: form.type === "Creature" ? form.creature : null,
    });
    setForm(EMPTY_COMBATANT);
    setErrors(NO_ERRORS);
    nameInputRef.current?.focus();
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit}
      style={{
        borderTop: "1px solid",
        padding: "1%",
        display: "flex",
        justifyContent: "space-between",
        flexDirection: narrow ? "column" : "row",
      }}
    >
      <CombatantForm
        form={form}
        errors={errors}
        onChange={(changes) => setForm((current) => applyChange(current, changes))}
        nameInputRef={nameInputRef}
      />
      <div style={{ alignSelf: "center" }}>
        <ButtonGroup orientation={narrow ? "horizontal" : "vertical"} aria-label="combatant actions">
          <Button type="submit">Submit</Button>
          <Button onClick={onAddPlayers}>Characters</Button>
          <Button onClick={onClear}>Clear</Button>
          <Button onClick={onSort}>Sort</Button>
        </ButtonGroup>
      </div>
    </Box>
  );
}
