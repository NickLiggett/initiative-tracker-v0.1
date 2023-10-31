import React, { useState, useEffect } from "react";
import GridFooter from "./GridFooter";
import GridToolbar from "./GridToolbar";
import { DataGrid } from "@mui/x-data-grid";
import { Checkbox, Typography, Tooltip } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import ArticleIcon from "@mui/icons-material/Article";
import MonsterInfo from "../components/MonsterInfo";

import { fetchAllMonsters } from "../utils";

export default function App() {
  const [gridRows, setGridRows] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [submittedMonsters, setSubmittedMonsters] = useState([]);
  const [monsterInfo, setMonsterInfo] = useState(submittedMonsters[0]);
  const [showMonsterModal, setShowMonsterModal] = useState(false);

  const toolbarProps = { gridRows: gridRows, setGridRows: setGridRows };
  const footerProps = {
    gridRows: gridRows,
    setGridRows: setGridRows,
    monsters: monsters,
    submittedMonsters: submittedMonsters,
    setSubmittedMonsters: setSubmittedMonsters,
  };

  useEffect(() => {
    fetchAllMonsters().then((data) => {
      setMonsters(data.results);
    });
  }, []);

  const columns = [
    { field: "initiative", headerName: "Initiative", editable: true },
    { field: "name", headerName: "Name", width: 150, editable: true },
    { field: "ac", headerName: "AC", sortable: false, editable: true },
    {
      field: "hp",
      headerName: "HP",
      sortable: false,
      editable: true,
      valueGetter: (params) => {
        let player = gridRows.find((row) => row.id === params.row.id);
        if (player) {
          return player.hp;
        }
      },
    },
    {
      field: "reaction",
      headerName: "Reaction",
      sortable: false,
      renderCell: (params) => {
        return (
          <Checkbox
            checked={params.row.reaction}
            key={params.id}
            size="small"
            sx={{ p: 0 }}
            onChange={(event) => handleReactionCheck(event, params)}
          />
        );
      },
    },
    {
      field: "legendaryOptions",
      flex: 1,
      sortable: false,
      renderHeader: () => {
        let result = gridRows.some((row) => {
          return row.monsterData && row.monsterData.legendary_actions.length > 0;
        });
        return result ? "Legendary Options" : null
      },
      renderCell: (params) => {
        if (
          params.row.monsterData &&
          params.row.monsterData.legendary_actions.length > 0
        ) {
          return (
            <div>
              <div style={{ display: "flex" }}>
                <Typography style={{ marginRight: 5 }}>Actions:</Typography>
                {buildCheckboxes(
                  params.row.monsterData.legendary_actions.length
                )}
              </div>
              <div style={{ display: "flex" }}>
                {params.row.monsterData.special_abilities.some(
                  (ability) => ability.name === "Legendary Resistance"
                ) && (
                  <div style={{ display: "flex" }}>
                    <Typography style={{ marginRight: 5 }}>
                      Resistances:
                    </Typography>
                    {buildCheckboxes(
                      params.row.monsterData.special_abilities[
                        params.row.monsterData.special_abilities.findIndex(
                          (ability) => ability.name === "Legendary Resistance"
                        )
                      ].usage.times
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }
      },
    },
    {
      field: "delete",
      sortable: false,
      width: 20,
      flex: 1,
      renderHeader: () => null,
      renderCell: (params) => {
        return (
          <div
            key={params.row.id}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              flexDirection: "row-reverse",
            }}
          >
            <ClearIcon
              sx={{ width: 18, height: 18, m: 1 }}
              onClick={() => handleDelete(params.row.id)}
            />
            {params.row.type === "Monster" && (
              <Tooltip title={`${params.row.monsterType.name} Information`}>
                <ArticleIcon
                  sx={{ width: 30, height: 30, m: 1 }}
                  onClick={() => {
                    let selectedMonster = submittedMonsters.find(
                      (monster) =>
                        monster.index === params.row.monsterType.index
                    );
                    console.log(selectedMonster);
                    setShowMonsterModal(true);
                    setMonsterInfo(selectedMonster);
                  }}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const handleDelete = (id) => {
    let newRows = [...gridRows].filter((row) => row.id !== id);
    setGridRows(newRows);
  };

  /**
   * If the HP input starts with "+", add the rest of the input to HP.
   * If it starts with "-", subtract the rest of the input from HP.
   * Otherwise, change HP to the input.
   * @param {*} params
   * @param {*} newValue
   */
  const handleHealthPointsEdit = (params, newValue) => {
    let currentHP = parseInt(params.value);
    let newHP;
    if (newValue.startsWith("+")) {
      newValue = parseInt(newValue.slice(1));
      newHP = newValue + currentHP;
    } else if (newValue.startsWith("-")) {
      newValue = parseInt(newValue.slice(1));
      newHP = currentHP - newValue;
    } else {
      newHP = parseInt(newValue);
    }
    let newRow = { ...params.row };
    newRow.hp = newHP;
    let index = gridRows.findIndex((row) => row.id === params.row.id);
    let newRows = [...gridRows];
    newRows.splice(index, 1, newRow);
    setGridRows(newRows);
  };

  /**
   * Handles the flow of editing cells and updating state to reflect those edits.
   * @param {*} params
   * @param {*} event
   * @returns
   */
  const handleEdit = (params, event) => {
    let newValue = event.target?.value;
    if (newValue === undefined) {
      return;
    }

    if (params.field !== "name") {
      if (params.field === "hp") {
        handleHealthPointsEdit(params, newValue);
        return;
      } else {
        newValue = parseInt(newValue);
      }
    }
    let newRow = { ...params.row };
    newRow[params.field] = newValue;
    let index = gridRows.findIndex((row) => row.id === params.row.id);
    let newRows = [...gridRows];
    newRows.splice(index, 1, newRow);
    setGridRows(newRows);
  };

  /**
   * Selects the input of a cell when it starts to be edited
   */
  const selectInput = () => {
    setTimeout(() => {
      let input = document.querySelector("input");
      input.select();
    }, 10);
  };

  /**
   * Updates state when reaction checkboxes are toggled.
   * @param {*} event
   * @param {*} params
   */
  const handleReactionCheck = (event, params) => {
    let newRows = [...gridRows];
    const index = newRows.findIndex((row) => row.id === params.id);
    newRows[index].reaction = event.target.checked;
    setGridRows(newRows);
  };

  /**
   * Builds MUI Checkboxes for each element in a given array
   * @param {*} data
   * @returns
   */
  const buildCheckboxes = (number) => {
    let data = [];
    for (let i = 0; i < number; i++) {
      data.push(false);
    }

    return data.map((element, index) => {
      return <Checkbox key={index} size="small" sx={{ p: 0 }} />;
    });
  };

  return (
    <div style={appStyles}>
      <div style={{ width: "80%", height: "80%" }}>
        <DataGrid
          rows={gridRows}
          columns={columns}
          columnHeaderHeight={50}
          slots={{
            toolbar: GridToolbar,
            footer: GridFooter,
          }}
          slotProps={{
            toolbar: toolbarProps,
            footer: footerProps,
          }}
          localeText={{ noRowsLabel: "Add a character" }}
          onCellEditStart={() => selectInput()}
          onCellEditStop={(params, event) => handleEdit(params, event)}
          disableColumnMenu={true}
          sx={{ border: "1px solid" }}
        />
      </div>
      {monsterInfo && (
        <MonsterInfo
          showMonsterModal={showMonsterModal}
          setShowMonsterModal={setShowMonsterModal}
          monsterInfo={monsterInfo}
        />
      )}
    </div>
  );
}

const appStyles = {
  display: "flex",
  justifyContent: "center",
  alignItems: " center",
  height: "100%",
  width: "100%",
};
