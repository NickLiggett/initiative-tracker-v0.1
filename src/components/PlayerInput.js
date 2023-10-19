import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
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
  nameError,
  initiativeError,
  typeError,
  nameInputRef,
}) => {
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
    <div style={{ display: "flex", flexDirection: "column" }}>
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
        <FormControl sx={{ width: 130, m: 1 }} size="small">
          <InputLabel id="type-select-label" error={typeError}>
            Type
          </InputLabel>
          <Select
            labelId="type-select-label"
            id="type-select"
            label="Type"
            value={playerType}
            onChange={(event) => setPlayerType(event.target.value)}
            error={typeError}
          >
            <MenuItem value={"PC"}>PC</MenuItem>
            <MenuItem value={"NPC"}>NPC</MenuItem>
            <MenuItem value={"Monster"}>Monster</MenuItem>
            <MenuItem value={"Legendary"}>Legendary</MenuItem>
            <MenuItem value={"Other"}>Other</MenuItem>
          </Select>
        </FormControl>
        {playerType === "Legendary" && (
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography>Legendary Actions: </Typography>
              <TextField
                id="legendary-actions-text-field"
                variant="outlined"
                size="small"
                value={legActions}
                onChange={(event) =>
                  handleDigitChange(event.target.value, setLegActions)
                }
                sx={{ width: 55, m: 1 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography>Legendary Resistances: </Typography>
              <TextField
                id="legendary-actions-text-field"
                variant="outlined"
                size="small"
                value={legResistances}
                onChange={(event) =>
                  handleDigitChange(event.target.value, setLegResistances)
                }
                sx={{ width: 55, m: 1 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInput;
