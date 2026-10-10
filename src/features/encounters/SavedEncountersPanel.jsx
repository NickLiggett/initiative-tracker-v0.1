import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { MAX_NAME_LENGTH, isSaved, summarize } from "./savedEncounters";

/**
 * Saves the encounter being built under a name, and lists the saved ones to load or delete. Saving under a name that is
 * already used replaces that encounter.
 *
 * @param {?object[]} encounters the saved ones; null while they load
 * @param {?string} loadError
 * @param {string} name what the encounter is called
 * @param {(name: string) => void} onName
 * @param {boolean} canSave whether there is anything to save (creatures in the encounter)
 * @param {boolean} busy something is being saved, loaded or deleted
 * @param {() => void} onSave
 * @param {(encounter: object) => void} onLoad
 * @param {(encounter: object) => void} onDelete
 */
export default function SavedEncountersPanel({ encounters, loadError, name, onName, canSave, busy, onSave, onLoad, onDelete }) {
  const replacing = encounters ? isSaved(encounters, name) : false;

  return (
    <Box component="section" aria-label="Saved encounters">
      <Typography variant="h6" component="h2">
        Saved encounters
      </Typography>
      {loadError && <Alert severity="warning">{loadError}</Alert>}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Encounter name"
          value={name}
          onChange={(event) => onName(event.target.value.slice(0, MAX_NAME_LENGTH))}
          helperText={replacing ? "Saving replaces the encounter with this name." : " "}
          sx={{ width: 280 }}
        />
        <Button variant="outlined" disabled={busy || !canSave || name.trim() === "" || encounters === null} onClick={onSave} sx={{ mt: 0.25 }}>
          {replacing ? "Replace" : "Save"}
        </Button>
      </Box>

      {encounters && encounters.length > 0 && (
        <Box component="ul" aria-label="Saved" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {encounters.map((encounter) => (
            <Box component="li" key={encounter.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ overflowWrap: "anywhere" }}>{encounter.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {summarize(encounter)}
                </Typography>
              </Box>
              <Button size="small" disabled={busy} onClick={() => onLoad(encounter)} aria-label={`Load ${encounter.name}`}>
                Load
              </Button>
              <Button size="small" color="error" disabled={busy} onClick={() => onDelete(encounter)} aria-label={`Delete ${encounter.name}`}>
                Delete
              </Button>
            </Box>
          ))}
        </Box>
      )}
      {encounters && encounters.length === 0 && !loadError && (
        <Typography color="text.secondary" variant="body2">
          Nothing saved yet. Build an encounter, name it, and save it to use it again.
        </Typography>
      )}
    </Box>
  );
}
