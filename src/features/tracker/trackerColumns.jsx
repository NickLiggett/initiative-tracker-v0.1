import { Checkbox, Tooltip, Typography } from "@mui/material";
import { Clear as ClearIcon, Article as ArticleIcon } from "@mui/icons-material";
import { legendaryActionsPerRound, legendaryResistancesPerDay } from "../creatures/creatureFormat";

/**
 * The initiative grid's columns.
 * @param {{combatants: object[], onReactionChange: Function, onDelete: Function, onShowCreature: Function}} handlers
 */
export function buildColumns({ combatants, onReactionChange, onDelete, onShowCreature }) {
  const anyLegendary = combatants.some((combatant) => legendaryActionsPerRound(combatant.creature) > 0);

  return [
    { field: "initiative", headerName: "Initiative", editable: true },
    { field: "name", headerName: "Name", width: 150, editable: true },
    { field: "ac", headerName: "AC", sortable: false, editable: true },
    { field: "hp", headerName: "HP", sortable: false, editable: true },
    {
      field: "reaction",
      headerName: "Reaction",
      sortable: false,
      renderCell: (params) => (
        <Checkbox
          checked={Boolean(params.row.reaction)}
          size="small"
          sx={{ p: 0 }}
          onChange={(event) => onReactionChange(params.row.id, event.target.checked)}
        />
      ),
    },
    {
      field: "legendaryOptions",
      flex: 1,
      sortable: false,
      renderHeader: () => (anyLegendary ? "Legendary Options" : null),
      renderCell: (params) => <LegendaryOptions creature={params.row.creature} />,
    },
    {
      field: "delete",
      sortable: false,
      renderHeader: () => null,
      renderCell: (params) => (
        <div style={actionCellStyles}>
          <ClearIcon sx={{ width: 18, height: 18, m: 1 }} onClick={() => onDelete(params.row.id)} />
          {params.row.creature && (
            <Tooltip title={`${params.row.creature.name} Information`}>
              <ArticleIcon sx={{ width: 30, height: 30, m: 1 }} onClick={() => onShowCreature(params.row.creature)} />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];
}

/** Checkboxes for the legendary actions and resistances a creature has left. */
function LegendaryOptions({ creature }) {
  const actions = legendaryActionsPerRound(creature);
  if (actions === 0) {
    return null;
  }
  const resistances = legendaryResistancesPerDay(creature);
  return (
    <div>
      <div style={{ display: "flex" }}>
        <Typography style={{ marginRight: 5 }}>Actions:</Typography>
        <Checkboxes count={actions} />
      </div>
      {resistances > 0 && (
        <div style={{ display: "flex" }}>
          <Typography style={{ marginRight: 5 }}>Resistances:</Typography>
          <Checkboxes count={resistances} />
        </div>
      )}
    </div>
  );
}

function Checkboxes({ count }) {
  return Array.from({ length: count }, (_, index) => <Checkbox key={index} size="small" sx={{ p: 0 }} />);
}

const actionCellStyles = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  flexDirection: "row-reverse",
};
