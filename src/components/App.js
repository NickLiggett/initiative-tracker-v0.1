import React, { useState, useEffect } from "react";
import GridFooter from "./GridFooter";
import GridToolbar from "./GridToolbar";
import { DataGrid } from "@mui/x-data-grid";
import { Checkbox, Typography, Tooltip, Dialog, DialogTitle } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import ArticleIcon from "@mui/icons-material/Article";

import { fetchAllMonsters, fetchMonster } from "../utils";

export default function App() {
  const [gridRows, setGridRows] = useState([]);
  const [monsters, setMonsters] = useState([]); // TODO: useRef instead.
  const [monsterInfo, setMonsterInfo] = useState({});
  const [showMonsterModal, setShowMonsterModal] = useState(false);

  const toolbarProps = { gridRows: gridRows, setGridRows: setGridRows };
  const footerProps = {
    gridRows: gridRows,
    setGridRows: setGridRows,
    monsters: monsters,
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
              <Tooltip title="Monster Informtaion">
                <ArticleIcon sx={{ width: 30, height: 30, m: 1 }} onClick={async () => {
                  let monsterEndpoint = params.row.monsterType.url
                  let data = await fetchMonster(monsterEndpoint)
                  console.log("Monster Info: ", data)
                  setShowMonsterModal(true)
                  setMonsterInfo(data)
                }}/>
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
  const buildCheckboxes = (data) => {
    return data.map((element, index) => {
      return <Checkbox key={index} size="small" sx={{ p: 0 }} />;
    });
  };

  /**
   * Determines whether a legendary type exists in the rows
   * @returns boolean
   */
  const areThereLegendaries = () => {
    return gridRows.some((row) => row.type === "Legendary");
  };

  /**
   * Conditionally renders the Legendary column.
   */
  if (areThereLegendaries()) {
    columns.splice(columns.length - 1, 0, {
      field: "legendaryOptions",
      headerName: "Legendary Options",
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        if (params.row.type !== "Legendary") {
          return;
        }
        return (
          <div>
            <div style={{ display: "flex" }}>
              <Typography style={{ marginRight: 5 }}>Actions:</Typography>
              {buildCheckboxes(params.value.legendaryActions)}
            </div>
            <div style={{ display: "flex" }}>
              <Typography style={{ marginRight: 5 }}>Resistances:</Typography>
              {buildCheckboxes(params.value.legendaryResistances)}
            </div>
          </div>
        );
      },
    });
  }

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
      <Dialog open={showMonsterModal} onClose={() => setShowMonsterModal(false)}>
        <DialogTitle>{monsterInfo.name}</DialogTitle>
      </Dialog>
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
