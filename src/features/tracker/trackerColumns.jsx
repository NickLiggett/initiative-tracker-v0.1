import { Checkbox, IconButton, Tooltip, Typography } from "@mui/material";
import { Clear as ClearIcon, Article as ArticleIcon, Edit as EditIcon, Visibility, VisibilityOff } from "@mui/icons-material";
import { legendaryActionsPerRound, legendaryResistancesPerDay } from "../creatures/creatureFormat";
import { columnLabel, TRACKER_COLUMNS, DEFAULT_TRACKER_COLUMNS, DEFAULT_NOTE_NAMES } from "./columnChoices";
import { allFieldShown, damageTaken, fieldShown, formatHp, knowsMaxHp, isCharacter, shownHp } from "./combatants";

/** How many legendary actions a row has: what was set for it, otherwise its creature's. */
export const legendaryActionsOf = (combatant) => combatant.legendaryActions ?? legendaryActionsPerRound(combatant.creature);

/** How many Legendary Resistance uses a row has: what was set for it, otherwise its creature's. */
export const legendaryResistancesOf = (combatant) => combatant.legendaryResistances ?? legendaryResistancesPerDay(combatant.creature);

/** Whether a cell can be edited: the damage taken needs the most hit points to be known. */
export const isCellEditable = ({ field, row }) => field !== "damageTaken" || knowsMaxHp(row);

/**
 * The initiative grid's columns: the ones chosen in Settings (see columnChoices.js), then the one with the buttons for
 * showing a creature or character, and for deleting the row, which is always there.
 * @param {{hpMode: "down"|"up", visible: string[], noteNames: string[], combatants: object[], onReactionChange: Function, onDelete: Function, onShowCreature: Function, onShowPlayer: Function, onRevealChange: (id, field, shown) => void, onRevealAllChange: (field, shown) => void, onEdit: Function}} handlers
 */
export function buildColumns({
  hpMode = "down",
  visible = DEFAULT_TRACKER_COLUMNS,
  noteNames = DEFAULT_NOTE_NAMES,
  combatants,
  onReactionChange,
  onDelete,
  onShowCreature,
  onShowPlayer,
  onRevealChange = () => {},
  onRevealAllChange = () => {},
  onEdit = () => {},
}) {
  const anyLegendary = combatants.some((combatant) => legendaryActionsOf(combatant) > 0);
  const chosen = new Set(visible);
  const label = (id) => columnLabel(TRACKER_COLUMNS.find((column) => column.id === id), noteNames);

  const all = [
    { field: "initiative", headerName: "Initiative", editable: true },
    {
      field: "name",
      headerName: "Name",
      width: 170,
      editable: true,
      renderHeader: () => <ColumnHeader label="Name" field="name" combatants={combatants} onChange={onRevealAllChange} />,
      renderCell: ({ row }) => <WithReveal row={row} field="name" onChange={onRevealChange}>{row.name}</WithReveal>,
    },
    {
      field: "ac",
      headerName: "AC",
      sortable: false,
      editable: true,
      width: 110,
      renderHeader: () => <ColumnHeader label="AC" field="ac" combatants={combatants} onChange={onRevealAllChange} />,
      renderCell: ({ row }) => <WithReveal row={row} field="ac" onChange={onRevealChange}>{row.ac}</WithReveal>,
    },
    {
      // Edited as the number counted (see shownHp); the typed text goes to `hpInput`, which the page turns into hit points.
      field: "hp",
      headerName: "HP",
      sortable: false,
      editable: true,
      valueGetter: ({ row }) => shownHp(row, hpMode),
      valueSetter: ({ value, row }) => ({ ...row, hpInput: value }),
      width: 130,
      renderHeader: () => <ColumnHeader label="HP" field="hp" combatants={combatants} onChange={onRevealAllChange} />,
      renderCell: ({ row }) => <WithReveal row={row} field="hp" onChange={onRevealChange}>{formatHp(row, hpMode)}</WithReveal>,
    },
    {
      field: "tempHp",
      headerName: "Temp HP",
      sortable: false,
      editable: true,
      valueGetter: ({ row }) => row.tempHp ?? 0,
    },
    {
      // The damage a row has taken, typed as "+5" to add some, or "-3" to take some back; it needs the most hit points to be known.
      field: "damageTaken",
      headerName: "Damage taken",
      sortable: false,
      editable: true,
      valueGetter: ({ row }) => damageTaken(row),
      valueSetter: ({ value, row }) => ({ ...row, damageInput: value }),
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
    ...[0, 1, 2].map((index) => ({
      field: `note${index + 1}`,
      headerName: label(`note${index + 1}`),
      sortable: false,
      editable: true,
      width: 180,
      valueGetter: ({ row }) => row[`note${index + 1}`] ?? "",
    })),
    {
      field: "edit",
      sortable: false,
      renderHeader: () => null,
      width: 60,
      renderCell: (params) => (
        <Tooltip title={`Edit ${params.row.name}`}>
          <IconButton size="small" aria-label={`Edit ${params.row.name}`} onClick={() => onEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
  return all.filter((column) => column.field === "delete" || chosen.has(column.field));
}

const WHAT = { name: "name", ac: "AC", hp: "HP" };

/** A cell's value, with (for anything but a character) the eye that shows or hides it from the players. */
function WithReveal({ row, field, onChange, children }) {
  const shown = fieldShown(row, field);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span>{children}</span>
      {!isCharacter(row) && (
        <Tooltip title={shown ? `Players see its ${WHAT[field]}` : `Hidden from players: its ${WHAT[field]} shows as ?`}>
          <IconButton
            size="small"
            aria-label={`${shown ? "Hide" : "Reveal"} ${WHAT[field]} ${shown ? "of" : "for"} ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onChange(row.id, field, !shown);
            }}
          >
            {shown ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}

/** A column's heading, with the eye that shows or hides that field for every row that isn't a character. */
function ColumnHeader({ label, field, combatants, onChange }) {
  const all = allFieldShown(combatants, field);
  const any = combatants.some((combatant) => !isCharacter(combatant));
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {label}
      {any && (
        <Tooltip title={all ? `Players see every ${WHAT[field]}` : `Show every ${WHAT[field]} to the players`}>
          <IconButton
            size="small"
            aria-label={`${all ? "Hide" : "Reveal"} ${WHAT[field]} for all monsters`}
            onClick={(event) => {
              event.stopPropagation();
              onChange(field, !all);
            }}
          >
            {all ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
          </IconButton>
        </Tooltip>
      )}
    </span>
  );
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
