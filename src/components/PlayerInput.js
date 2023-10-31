import { useState } from "react";
import {
  TextField,
  FormControl,
  Autocomplete,
  Typography,
  Checkbox,
} from "@mui/material";

const PlayerInput = ({
  name,
  setName,
  playerInitiative,
  setPlayerInitiative,
  armorClass,
  setArmorClass,
  healthPoints,
  setHealthPoints,
  playerType,
  setPlayerType,
  legActions,
  setLegActions,
  legResistances,
  setLegResistances,
  monsterType,
  setMonsterType,
  nameError,
  initiativeError,
  typeError,
  nameInputRef,
  handleSubmit,
  monsters,
}) => {
  const [typeInput, setTypeInput] = useState("");
  const [monsterTypeInput, setMonsterTypeInput] = useState("");

  const handleDigitChange = (input, setData) => {
    // Allow empty inputs
    if (input === "") {
      setData("");
    }

    // Character limit is 2
    if (/^\d+$/.test(input) && input.length <= 2) {
      setData(input);
    }

    // Health Points character limit is 4
    if (
      setData === setHealthPoints &&
      /^\d+$/.test(input) &&
      input.length <= 4
    ) {
      setData(input);
    }
  };

  const handleNameChange = (input) => {
    if (input.length <= 25) {
      setName(input);
    }
  };

  return (
    <div
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div>
        <TextField
          id="name-text-field"
          label="Name"
          variant="outlined"
          size="small"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          sx={{ m: 1 }}
          error={nameError}
          inputRef={nameInputRef}
        />
        <TextField
          id="initiative-text-field"
          label="Initiative"
          variant="outlined"
          size="small"
          value={playerInitiative}
          onChange={(event) =>
            handleDigitChange(event.target.value, setPlayerInitiative)
          }
          sx={{ width: 90, m: 1 }}
          error={initiativeError}
        />
        <TextField
          id="armor-class-text-field"
          label="AC"
          variant="outlined"
          size="small"
          value={armorClass}
          onChange={(event) =>
            handleDigitChange(event.target.value, setArmorClass)
          }
          sx={{ width: 75, m: 1 }}
        />
        <TextField
          id="health-points-text-field"
          label="HP"
          variant="outlined"
          size="small"
          value={healthPoints}
          onChange={(event) =>
            handleDigitChange(event.target.value, setHealthPoints)
          }
          sx={{ width: 75, m: 1 }}
        />
      </div>
      <div style={{ display: "flex" }}>
        <FormControl sx={{ width: 180, m: 1 }} size="small">
          <Autocomplete
            freeSolo={true}
            disablePortal
            autoHighlight={true}
            id="combo-box-demo"
            options={["PC", "NPC", "Monster", "Other"]}
            size="small"
            value={playerType}
            onChange={(event, newValue) => setPlayerType(newValue)}
            inputValue={typeInput}
            onInputChange={(event, newValue) => setTypeInput(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Type" error={typeError} />
            )}
          />
        </FormControl>
        {playerType === "Monster" && (
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Autocomplete
                freeSolo={true}
                disablePortal
                autoHighlight={true}
                id="combo-box-demo"
                value={monsterType}
                onChange={(event, newValue) => setMonsterType(newValue)}
                inputValue={monsterTypeInput}
                onInputChange={(event, newValue) =>
                  setMonsterTypeInput(newValue)
                }
                options={monsters}
                getOptionLabel={(option) => {
                  if (option) {
                    return option.name;
                  } else {
                    return "";
                  }
                }}
                size="small"
                sx={{ width: 180, m: 1 }}
                renderInput={(params) => (
                  <TextField {...params} label="Monster" />
                )}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 15,
                }}
              >
                <Typography>Mob:</Typography>
                <Checkbox />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInput;
