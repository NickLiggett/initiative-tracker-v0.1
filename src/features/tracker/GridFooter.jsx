import { useRef, useState } from "react";
import { Box, Button, ButtonGroup, useMediaQuery } from "@mui/material";
import CombatantForm, { EMPTY_COMBATANT } from "./CombatantForm";

const NO_ERRORS = { name: false, initiative: false, type: false };

/** The grid's footer: the form for adding combatants, and Submit / Players (pick players to add) / Clear / Sort. */
export default function GridFooter({ onAdd, onAddPlayers, onClear, onSort }) {
  const [form, setForm] = useState(EMPTY_COMBATANT);
  const [errors, setErrors] = useState(NO_ERRORS);
  const nameInputRef = useRef();
  const narrow = useMediaQuery("(max-width: 730px)");

  const handleSubmit = () => {
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
        onChange={(changes) => setForm((current) => ({ ...current, ...changes }))}
        nameInputRef={nameInputRef}
      />
      <div style={{ alignSelf: "center" }}>
        <ButtonGroup orientation={narrow ? "horizontal" : "vertical"} aria-label="combatant actions">
          <Button onClick={handleSubmit}>Submit</Button>
          <Button onClick={onAddPlayers}>Players</Button>
          <Button onClick={onClear}>Clear</Button>
          <Button onClick={onSort}>Sort</Button>
        </ButtonGroup>
      </div>
    </Box>
  );
}
