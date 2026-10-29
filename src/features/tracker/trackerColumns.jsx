import { Checkbox, IconButton, Tooltip, Typography } from "@mui/material";
import { Clear as ClearIcon, Article as ArticleIcon, Visibility, VisibilityOff } from "@mui/icons-material";
import { legendaryActionsPerRound, legendaryResistancesPerDay } from "../creatures/creatureFormat";
import { formatHp, isCharacter, shownHp } from "./combatants";

/** How many legendary actions a row has: what was set for it, otherwise its creature's. */
export const legendaryActionsOf = (combatant) => combatant.legendaryActions ?? legendaryActionsPerRound(combatant.creature);

/** How many Legendary Resistance uses a row has: what was set for it, otherwise its creature's. */
export const legendaryResistancesOf = (combatant) => combatant.legendaryResistances ?? legendaryResistancesPerDay(combatant.creature);

/**
 * The initiative grid's columns.
 * @param {{hpMode: "down"|"up", combatants: object[], onReactionChange: Function, onDelete: Function, onShowCreature: Function, onShowPlayer: Function, onRevealChange: Function}} handlers
 */
export function buildColumns({ hpMode = "down", combatants, onReactionChange, onDelete, onShowCreature, onShowPlayer, onRevealChange }) {
  const anyLegendary = combatants.some((combatant) => legendaryActionsOf(combatant) > 0);

  return [
    { field: "initiative", headerName: "Initiative", editable: true },
    { field: "name", headerName: "Name", width: 150, editable: true },
    { field: "ac", headerName: "AC", sortable: false, editable: true },
    {
      // Edited as the number counted (see shownHp); the typed text goes to `hpInput`, which the page turns into hit points.
      field: "hp",
      headerName: "HP",
      sortable: false,
      editable: true,
      valueGetter: ({ row }) => shownHp(row, hpMode),
      valueSetter: ({ value, row }) => ({ ...row, hpInput: value }),
      renderCell: ({ row }) => formatHp(row, hpMode),
    },
    {
      field: "revealed",
      headerName: "Players see",
      sortable: false,
      renderCell: (params) =>
        isCharacter(params.row) ? null : (
          <Tooltip title={params.row.revealed ? "Players see its AC and HP" : "Hidden from players: AC and HP show as ?"}>
            <IconButton
              size="small"
              aria-label={`${params.row.revealed ? "Hide" : "Reveal"} AC and HP ${params.row.revealed ? "of" : "for"} ${params.row.name}`}
              onClick={() => onRevealChange(params.row.id, !params.row.revealed)}
            >
              {params.row.revealed ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
            </IconButton>
          </Tooltip>
        ),
    },
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
      renderCell: (params) => <LegendaryOptions combatant={params.row} />,
    },
    {
      field: "delete",
      sortable: false,
      renderHeader: () => null,
      renderCell: (params) => (
        <div style={actionCellStyles}>
          <ClearIcon sx={{ width: 18, height: 18, m: 1 }} onClick={() => onDelete(params.row.id)} />
          {params.row.playerId != null && (
            <Tooltip title={`${params.row.name} Information`}>
              <ArticleIcon sx={{ width: 30, height: 30, m: 1 }} onClick={() => onShowPlayer(params.row)} />
            </Tooltip>
          )}
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
function LegendaryOptions({ combatant }) {
  const actions = legendaryActionsOf(combatant);
  if (actions === 0) {
    return null;
  }
  const resistances = legendaryResistancesOf(combatant);
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
