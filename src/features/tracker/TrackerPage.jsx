import { useRef, useState } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import GridFooter from "./GridFooter";
import GridToolbar from "./GridToolbar";
import CreatureInfoDialog from "../creatures/CreatureInfoDialog";
import PlayerPicker from "./PlayerPicker";
import PlayerSheetDialog from "./PlayerSheetDialog";
import TrackersDialog from "./TrackersDialog";
import { playerIdsIn } from "./playerCombatants";
import { buildColumns } from "./trackerColumns";
import useSavedTracker from "./useSavedTracker";
import useNextTurnShortcut from "./useNextTurnShortcut";
import {
  applyHpInput,
  nextTurn,
  previousTurn,
  removeCombatant,
  setAllRevealed,
  sortByInitiative,
  updateCombatant,
} from "./combatants";

const EDITABLE_FIELDS = ["initiative", "name", "ac", "hp"];

/** The initiative tracker: the turn order as an editable grid, with a form to add combatants. */
export default function TrackerPage() {
  const { combatants, setCombatants, name, setName, switchTracker, nextId, status, notice, retry } = useSavedTracker();
  const [shownCreature, setShownCreature] = useState(null);
  const [shownPlayer, setShownPlayer] = useState(null); // the combatant whose character is shown
  const [picking, setPicking] = useState(false);
  const [showingTrackers, setShowingTrackers] = useState(false);
  const gridRef = useRef(null);
  const apiRef = useGridApiRef();
  useNextTurnShortcut(() => setCombatants(nextTurn));

  const columns = buildColumns({
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
    const changes = {};
    for (const field of EDITABLE_FIELDS) {
      if (newRow[field] === oldRow[field]) {
        continue;
      }
      const input = newRow[field];
      let value;
      if (field === "name") {
        value = String(input);
      } else if (field === "hp") {
        value = applyHpInput(oldRow.hp, input);
      } else {
        value = parseInt(input, 10);
      }
      if (!Number.isNaN(value)) {
        changes[field] = value; // an input that isn't a number keeps the old value
      }
    }
    setCombatants((current) => updateCombatant(current, oldRow.id, changes));
    return { ...oldRow, ...changes };
  };

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
        disableColumnMenu
        sx={{ border: "1px solid" }}
      />
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
