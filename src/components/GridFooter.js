import React, { useState, useRef } from "react";
import PlayerInput from "./PlayerInput";
import { Box, Button, ButtonGroup } from "@mui/material";

import { fetchMonster } from "../utils";

const GridFooter = ({ gridRows, setGridRows, monsters, submittedMonsters, setSubmittedMonsters }) => {
  const [name, setName] = useState("");
  const [playerInitiative, setPlayerInitiative] = useState("");
  const [armorClass, setArmorClass] = useState("");
  const [healthPoints, setHealthPoints] = useState("");
  const [playerType, setPlayerType] = useState("");
  const [legActions, setLegActions] = useState("");
  const [legResistances, setLegResistances] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [nameError, setNameError] = useState(false);
  const [initiativeError, setInitiativeError] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const nameInputRef = useRef();


const handleSubmit = () => {
    if (name !== "" && playerInitiative !== "" && playerType !== "") {
        submitPlayer();
        clearState();
        nameInputRef.current.focus();
    }
    handleError();
  };

  const handleError = () => {
    if (name === "") {
      setNameError(true);
    }
    if (playerInitiative === "") {
      setInitiativeError(true);
    }
    if (playerType === "") {
      setTypeError(true);
    }
  };

  const submitPlayer = async () => {
    let newPlayer = {
      id: gridRows.length + 1,
      initiative: parseInt(playerInitiative),
      name: name,
      ac: armorClass === "" ? "" : parseInt(armorClass),
      hp: healthPoints === "" ? "" : parseInt(healthPoints),
      reaction: false,
      type: playerType,
      monsterType: monsterType || null
    };
    if (newPlayer.monsterType) {
      let monsterEndpoint = newPlayer.monsterType.url;
      let data = await fetchMonster(monsterEndpoint);
      newPlayer.monsterData = data
      setSubmittedMonsters([...submittedMonsters, data])
    }
    setGridRows([...gridRows, newPlayer]);
  };

  const clearRows = () => {
    setGridRows([]);
    setSubmittedMonsters([])
  };

  const sortRows = () => {
    let sortedRows = [...gridRows].sort((a, b) => b.initiative - a.initiative);
    setGridRows(sortedRows);
  };

  const clearState = () => {
    setName("");
    setPlayerInitiative("");
    setArmorClass("");
    setHealthPoints("");
    setPlayerType("");
    setLegActions("");
    setLegResistances("");
    setNameError(false);
    setInitiativeError(false);
    setTypeError(false);
    setMonsterType("");
  };

  return (
    <Box
      style={{
        borderTop: "1px solid",
        padding: "1%",
        display: "flex",
        justifyContent: "space-between",
        flexDirection: window.innerWidth <= 730 ? "column" : "row",
      }}
    >
      <PlayerInput
        name={name}
        setName={setName}
        playerInitiative={playerInitiative}
        setPlayerInitiative={setPlayerInitiative}
        armorClass={armorClass}
        setArmorClass={setArmorClass}
        healthPoints={healthPoints}
        setHealthPoints={setHealthPoints}
        playerType={playerType}
        setPlayerType={setPlayerType}
        legActions={legActions}
        setLegActions={setLegActions}
        legResistances={legResistances}
        setLegResistances={setLegResistances}
        monsterType={monsterType}
        setMonsterType={setMonsterType}
        nameError={nameError}
        initiativeError={initiativeError}
        typeError={typeError}
        nameInputRef={nameInputRef}
        handleSubmit={handleSubmit}
        monsters={monsters}
      />
      <div
        style={{
          alignSelf: "center",
          m: 1,
        }}
      >
        <ButtonGroup
          orientation={window.innerWidth <= 730 ? "horizontal" : "vertical"}
          aria-label="button group"
        >
          <Button key="one" onClick={handleSubmit}>
            Submit
          </Button>
          <Button key="two" onClick={clearRows}>
            Clear
          </Button>
          <Button key="three" onClick={sortRows}>
            Sort
          </Button>
        </ButtonGroup>
      </div>
    </Box>
  );
};

export default GridFooter;
