import { useRef, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import GridFooter from "./GridFooter";
import GridToolbar from "./GridToolbar";
import CreatureInfoDialog from "../creatures/CreatureInfoDialog";
import PlayerPicker from "./PlayerPicker";
import PlayerSheetDialog from "./PlayerSheetDialog";
import { playerIdsIn } from "./playerCombatants";
import { buildColumns } from "./trackerColumns";
import useSavedTracker from "./useSavedTracker";
import {
  applyHpInput,
  nextTurn,
  previousTurn,
  removeCombatant,
  sortByInitiative,
  updateCombatant,
} from "./combatants";

/** The initiative tracker: the turn order as an editable grid, with a form to add combatants. */
export default function TrackerPage() {
  const { combatants, setCombatants, nextId, status, notice, retry } = useSavedTracker();
  const [shownCreature, setShownCreature] = useState(null);
  const [shownPlayer, setShownPlayer] = useState(null); // the combatant whose player is shown
  const [picking, setPicking] = useState(false);
  const gridRef = useRef(null);

  const columns = buildColumns({
    combatants,
    onReactionChange: (id, reaction) => setCombatants((current) => updateCombatant(current, id, { reaction })),
    onDelete: (id) => setCombatants((current) => removeCombatant(current, id)),
    onShowCreature: setShownCreature,
    onShowPlayer: setShownPlayer,
  });

  const addCombatant = (combatant) => {
    const id = nextId.current++;
    setCombatants((current) => [...current, { ...combatant, id }]);
  };

  const addPlayers = (added) => {
    setCombatants((current) => [...current, ...added.map((combatant) => ({ ...combatant, id: nextId.current++ }))]);
    setPicking(false);
  };

  /** Applies an edited cell. HP accepts "+5" (heal) and "-7" (damage) as well as a new value. */
  const handleCellEditStop = (params, event) => {
    const input = event?.target?.value;
    if (input === undefined) {
      return;
    }
    let value;
    if (params.field === "name") {
      value = input;
    } else if (params.field === "hp") {
      value = applyHpInput(params.value, input);
    } else {
      value = parseInt(input, 10);
    }
    if (Number.isNaN(value)) {
      return; // keep the old value
    }
    setCombatants((current) => updateCombatant(current, params.id, { [params.field]: value }));
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
        rows={combatants}
        columns={columns}
        columnHeaderHeight={50}
        loading={status === "loading"}
        slots={{ toolbar: GridToolbar, footer: GridFooter }}
        slotProps={{
          toolbar: {
            onPrevious: () => setCombatants(previousTurn),
            onNext: () => setCombatants(nextTurn),
            saveStatus: status,
            notice,
            onRetry: retry,
          },
          footer: {
            onAdd: addCombatant,
            onAddPlayers: () => setPicking(true),
            onClear: () => setCombatants([]),
            onSort: () => setCombatants(sortByInitiative),
          },
        }}
        localeText={{ noRowsLabel: "Add a character" }}
        onCellEditStart={selectEditedInput}
        onCellEditStop={handleCellEditStop}
        disableColumnMenu
        sx={{ border: "1px solid" }}
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
