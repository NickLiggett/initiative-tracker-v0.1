import { useRef, useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import GridFooter from "./GridFooter";
import GridToolbar from "./GridToolbar";
import CreatureInfoDialog from "../creatures/CreatureInfoDialog";
import PlayerPicker from "./PlayerPicker";
import PlayerSheetDialog from "./PlayerSheetDialog";
import RowEditDialog from "./RowEditDialog";
import TrackersDialog from "./TrackersDialog";
import { useSettings } from "../../settings/SettingsContext";
import { playerIdsIn } from "./playerCombatants";
import { columnLabel, TRACKER_COLUMNS } from "./columnChoices";
import { buildColumns, isCellEditable } from "./trackerColumns";
import useSavedTracker from "./useSavedTracker";
import useNextTurnShortcut from "./useNextTurnShortcut";
import {
  editedFields,
  nextTurn,
  previousTurn,
  removeCombatant,
  setAllRevealed,
  sortByInitiative,
  updateCombatant,
} from "./combatants";

/** How long a finger is held on a row to open its menu, as a right-click does with a mouse. */
export const LONG_PRESS_MS = 500;

/** The initiative tracker: the turn order as an editable grid, with a form to add combatants. */
export default function TrackerPage() {
  const { combatants, setCombatants, name, setName, switchTracker, nextId, status, notice, retry } = useSavedTracker();
  const [shownCreature, setShownCreature] = useState(null);
  const [shownPlayer, setShownPlayer] = useState(null); // the combatant whose character is shown
  const [picking, setPicking] = useState(false);
  const [showingTrackers, setShowingTrackers] = useState(false);
  const [rowMenu, setRowMenu] = useState(null); // { id, top, left } of the menu on a row
  const [editing, setEditing] = useState(null); // the combatant being edited
  const pressTimer = useRef(null);
  const { settings } = useSettings();
  const gridRef = useRef(null);
  const apiRef = useGridApiRef();
  useNextTurnShortcut(() => setCombatants(nextTurn));

  const columns = buildColumns({
    hpMode: settings.hpMode,
    visible: settings.trackerColumns,
    noteNames: settings.noteNames,
    onEdit: setEditing,
    combatants,
    onReactionChange: (id, reaction) => setCombatants((current) => updateCombatant(current, id, { reaction })),
    onDelete: (id) => setCombatants((current) => removeCombatant(current, id)),
    onShowCreature: setShownCreature,
    onShowPlayer: setShownPlayer,
    onRevealChange: (id, revealed) => setCombatants((current) => updateCombatant(current, id, { revealed })),
  });

  /**
   * Wraps an action of the toolbar or footer so that a cell still being edited is saved first. The grid only does that
   * itself when focus goes to another cell or outside the grid, and these buttons are inside it.
   */
  const committing =
    (action) =>
    (...args) => {
      const editing = apiRef.current.state.editRows ?? {};
      for (const [id, fields] of Object.entries(editing)) {
        for (const field of Object.keys(fields)) {
          apiRef.current.publishEvent("cellEditStop", { id, field, reason: "cellFocusOut" });
        }
      }
      return action(...args);
    };

  const addCombatant = (combatant) => {
    const id = nextId.current++;
    setCombatants((current) => [...current, { ...combatant, id }]);
  };

  const addPlayers = (added) => {
    setCombatants((current) => [...current, ...added.map((combatant) => ({ ...combatant, id: nextId.current++ }))]);
    setPicking(false);
  };

  /**
   * Applies an edited row. HP accepts "+5" (heal) and "-7" (damage) as well as a new value. This is the grid's own commit
   * of the edit, so it also happens when focus leaves the cell (clicking Next turn), and not when Escape cancels it.
   */
  const processRowUpdate = (newRow, oldRow) => {
    const changes = editedFields(newRow, oldRow, settings.hpMode);
    setCombatants((current) => updateCombatant(current, oldRow.id, changes));
    return { ...oldRow, ...changes };
  };

  /** Opens the menu of the row under a right-click, or a finger held down on it. */
  const openRowMenu = (id, left, top) => setRowMenu({ id, left, top });

  const rowProps = {
    onContextMenu: (event) => {
      event.preventDefault();
      openRowMenu(Number(event.currentTarget.dataset.id), event.clientX, event.clientY);
    },
    onTouchStart: (event) => {
      const row = event.currentTarget;
      const { clientX, clientY } = event.touches[0];
      clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => openRowMenu(Number(row.dataset.id), clientX, clientY), LONG_PRESS_MS);
    },
    // moving the finger is scrolling, and lifting it is a tap: neither is a long press
    onTouchMove: () => clearTimeout(pressTimer.current),
    onTouchEnd: () => clearTimeout(pressTimer.current),
    onTouchCancel: () => clearTimeout(pressTimer.current),
  };
  const noteFields = TRACKER_COLUMNS.filter((column) => column.note !== undefined && settings.trackerColumns.includes(column.id)).map(
    (column) => ({ field: column.id, label: columnLabel(column, settings.noteNames) }),
  );
  const menuRow = rowMenu && combatants.find((combatant) => combatant.id === rowMenu.id);

  /** Selects the text of the cell being edited, so typing replaces it. */
  const selectEditedInput = () => {
    setTimeout(() => {
      const input = gridRef.current?.querySelector(".MuiDataGrid-cell--editing input");
      input?.select();
    }, 10);
  };

  return (
    <div style={{ width: "80%", height: "80%", marginTop: 40 }}>
      <DataGrid
        ref={gridRef}
        apiRef={apiRef}
        rows={combatants}
        columns={columns}
        columnHeaderHeight={50}
        loading={status === "loading"}
        slots={{ toolbar: GridToolbar, footer: GridFooter }}
        slotProps={{
          row: rowProps,
          toolbar: {
            onPrevious: committing(() => setCombatants(previousTurn)),
            onNext: committing(() => setCombatants(nextTurn)),
            onRevealAll: committing(() => setCombatants((current) => setAllRevealed(current, true))),
            onHideAll: committing(() => setCombatants((current) => setAllRevealed(current, false))),
            trackerName: name,
            onOpenTrackers: committing(() => setShowingTrackers(true)),
            saveStatus: status,
            notice,
            onRetry: retry,
          },
          footer: {
            onAdd: committing(addCombatant),
            onAddPlayers: committing(() => setPicking(true)),
            onClear: committing(() => setCombatants([])),
            onSort: committing(() => setCombatants(sortByInitiative)),
          },
        }}
        localeText={{ noRowsLabel: "Add a character" }}
        onCellEditStart={selectEditedInput}
        processRowUpdate={processRowUpdate}
        isCellEditable={isCellEditable}
        disableColumnMenu
        sx={{ border: "1px solid" }}
      />
      <Menu
        open={Boolean(menuRow)}
        onClose={() => setRowMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={rowMenu ? { top: rowMenu.top, left: rowMenu.left } : undefined}
      >
        <MenuItem
          onClick={() => {
            setEditing(menuRow);
            setRowMenu(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCombatants((current) => removeCombatant(current, menuRow.id));
            setRowMenu(null);
          }}
        >
          Delete
        </MenuItem>
      </Menu>
      {editing && (
        <RowEditDialog
          combatant={editing}
          noteFields={noteFields}
          inFight={playerIdsIn(combatants)}
          onSave={(changes) => {
            setCombatants((current) => updateCombatant(current, editing.id, changes));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <TrackersDialog
        open={showingTrackers}
        name={name}
        onRename={setName}
        onSwitch={switchTracker}
        onClose={() => setShowingTrackers(false)}
      />
      <PlayerPicker open={picking} inFight={playerIdsIn(combatants)} onAdd={addPlayers} onClose={() => setPicking(false)} />
      {shownPlayer && (
        <PlayerSheetDialog playerId={shownPlayer.playerId} name={shownPlayer.name} onClose={() => setShownPlayer(null)} />
      )}
      {shownCreature && (
        <CreatureInfoDialog open onClose={() => setShownCreature(null)} creature={shownCreature} />
      )}
    </div>
  );
}
