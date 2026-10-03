import { Box, Button, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@mui/icons-material";
import { USAGE_PARAM_DEFAULTS, USAGE_TYPES, moveEntry, newAction, newTrait } from "./creatureDraft";
import { ACTION_TYPES } from "./creatureFormat";

const ACTION_NAMES = {
  ACTION: "Action",
  BONUS_ACTION: "Bonus action",
  REACTION: "Reaction",
  LEGENDARY_ACTION: "Legendary action",
};

const DESCRIPTION_HINT = "**bold**, *italic* and lines starting with “- ” are understood";

/** Edits the creature's traits. `onChange` is given the new list. */
export function TraitsEditor({ traits, onChange }) {
  const update = (id, changes) => onChange(traits.map((trait) => (trait.id === id ? { ...trait, ...changes } : trait)));

  return (
    <EditorSection title="Traits" addLabel="Add trait" onAdd={() => onChange([...traits, newTrait()])}>
      {traits.map((trait, position) => (
        <Entry
          key={trait.id}
          label={`Trait ${position + 1}`}
          name={trait.name}
          onMove={(direction) => onChange(moveEntry(traits, trait.id, direction))}
          onRemove={() => onChange(traits.filter((candidate) => candidate.id !== trait.id))}
          canMoveUp={position > 0}
          canMoveDown={position < traits.length - 1}
        >
          <TextField label="Name" value={trait.name} onChange={(event) => update(trait.id, { name: event.target.value })} />
          <Description value={trait.desc} onChange={(desc) => update(trait.id, { desc })} />
        </Entry>
      ))}
    </EditorSection>
  );
}

/** Edits the creature's actions, bonus actions, reactions and legendary actions. `onChange` is given the new list. */
export function ActionsEditor({ actions, onChange }) {
  const update = (id, changes) => onChange(actions.map((action) => (action.id === id ? { ...action, ...changes } : action)));
  const groupOf = (action) => action.actionType;

  return (
    <>
      {ACTION_TYPES.map(({ type, heading }) => {
        const group = actions.filter((action) => action.actionType === type);
        return (
          <EditorSection
            key={type}
            title={heading}
            addLabel={`Add ${ACTION_NAMES[type].toLowerCase()}`}
            onAdd={() => onChange([...actions, newAction(type)])}
          >
            {group.map((action, position) => (
              <Entry
                key={action.id}
                label={`${ACTION_NAMES[type]} ${position + 1}`}
                name={action.name}
                onMove={(direction) => onChange(moveEntry(actions, action.id, direction, groupOf))}
                onRemove={() => onChange(actions.filter((candidate) => candidate.id !== action.id))}
                canMoveUp={position > 0}
                canMoveDown={position < group.length - 1}
              >
                <ActionFields action={action} onChange={(changes) => update(action.id, changes)} />
              </Entry>
            ))}
          </EditorSection>
        );
      })}
    </>
  );
}

function ActionFields({ action, onChange }) {
  const legendary = action.actionType === "LEGENDARY_ACTION";
  const usesNumber = action.usageType === "PER_DAY" || action.usageType === "RECHARGE_ON_ROLL";

  return (
    <>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "2fr 1fr" }}>
        <TextField label="Name" value={action.name} onChange={(event) => onChange({ name: event.target.value })} />
        <TextField
          select
          SelectProps={{ native: true }}
          label="Type"
          value={action.actionType}
          onChange={(event) => onChange({ actionType: event.target.value })}
        >
          {ACTION_TYPES.map(({ type }) => (
            <option key={type} value={type}>
              {ACTION_NAMES[type]}
            </option>
          ))}
        </TextField>
      </Box>
      <Description value={action.desc} onChange={(desc) => onChange({ desc })} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
        <TextField
          select
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }} // "No limit" is an empty value, which would leave the label over it
          label="Usage"
          value={action.usageType}
          onChange={(event) =>
            onChange({ usageType: event.target.value, usageParam: USAGE_PARAM_DEFAULTS[event.target.value] ?? "" })
          }
        >
          {USAGE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </TextField>
        {usesNumber && action.usageType === "PER_DAY" && (
          <TextField
            label="Times per day"
            value={action.usageParam}
            onChange={(event) => onChange({ usageParam: event.target.value.replace(/\D/g, "") })}
          />
        )}
        {usesNumber && action.usageType === "RECHARGE_ON_ROLL" && (
          <TextField
            select
            SelectProps={{ native: true }}
            label="Recharges on"
            value={action.usageParam}
            onChange={(event) => onChange({ usageParam: event.target.value })}
          >
            {[2, 3, 4, 5, 6].map((roll) => (
              <option key={roll} value={roll}>
                {roll === 6 ? "6" : `${roll}–6`}
              </option>
            ))}
          </TextField>
        )}
      </Box>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
        {legendary && (
          <TextField
            label="Legendary action cost"
            value={action.legendaryActionCost ?? 1}
            onChange={(event) => onChange({ legendaryActionCost: parseInt(event.target.value.replace(/\D/g, ""), 10) || null })}
          />
        )}
        <TextField
          label="Only in form"
          value={action.limitedToForm}
          onChange={(event) => onChange({ limitedToForm: event.target.value })}
          helperText="For shapechangers, e.g. “Bear form”"
        />
      </Box>
    </>
  );
}

function Description({ value, onChange }) {
  return (
    <TextField
      label="Description"
      multiline
      minRows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      helperText={DESCRIPTION_HINT}
    />
  );
}

function EditorSection({ title, addLabel, onAdd, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
      {children}
      <Box>
        <Button startIcon={<Add />} onClick={onAdd}>
          {addLabel}
        </Button>
      </Box>
    </Paper>
  );
}

/** One trait or action: its fields, and buttons to move or remove it. `label` is stable while the name is typed. */
function Entry({ label, name, onMove, onRemove, canMoveUp, canMoveDown, children }) {
  const what = name.trim() || label;
  return (
    <Paper role="group" aria-label={label} sx={{ p: 2, display: "grid", gap: 2, bgcolor: "action.hover" }} variant="outlined">
      {children}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
        <Tooltip title="Move up">
          <span>
            <IconButton aria-label={`Move ${what} up`} disabled={!canMoveUp} onClick={() => onMove(-1)}>
              <ArrowUpward />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton aria-label={`Move ${what} down`} disabled={!canMoveDown} onClick={() => onMove(1)}>
              <ArrowDownward />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remove">
          <IconButton aria-label={`Remove ${what}`} onClick={onRemove}>
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
