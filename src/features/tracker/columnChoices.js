// Which columns the initiative tracker can show, which it shows to begin with, and what the Notes columns are called.

/** Every column the user can choose, in the order they appear. `required` ones are always shown. */
export const TRACKER_COLUMNS = [
  { id: "initiative", label: "Initiative", required: true },
  { id: "name", label: "Name", required: true },
  { id: "ac", label: "AC" },
  { id: "hp", label: "HP" },
  { id: "tempHp", label: "Temp HP" },
  { id: "damageTaken", label: "Damage taken" },
  { id: "revealed", label: "Players see" },
  { id: "reaction", label: "Reaction" },
  { id: "legendaryOptions", label: "Legendary options" },
  { id: "note1", label: "Notes", note: 0 },
  { id: "note2", label: "Notes 2", note: 1 },
  { id: "note3", label: "Notes 3", note: 2 },
  { id: "edit", label: "Edit button" },
];

/** What the tracker shows until the user chooses. */
export const DEFAULT_TRACKER_COLUMNS = ["initiative", "name", "ac", "hp", "revealed", "reaction", "legendaryOptions"];

export const NOTE_FIELDS = TRACKER_COLUMNS.filter((column) => column.note !== undefined).map((column) => column.id);
export const MAX_NOTE_NAME_LENGTH = 30;
export const MAX_NOTE_LENGTH = 200;
export const DEFAULT_NOTE_NAMES = ["", "", ""];

const KNOWN = new Set(TRACKER_COLUMNS.map((column) => column.id));

/** A list of column ids fit to use: only known ones, each once, the required ones always, in display order. */
export function sanitizeColumns(raw) {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_TRACKER_COLUMNS];
  }
  const wanted = new Set(raw.filter((id) => KNOWN.has(id)));
  return TRACKER_COLUMNS.filter((column) => column.required || wanted.has(column.id)).map((column) => column.id);
}

/** Three names for the Notes columns, each trimmed and short; blank means the column's own default name. */
export function sanitizeNoteNames(raw) {
  const names = Array.isArray(raw) ? raw : [];
  return DEFAULT_NOTE_NAMES.map((_, index) =>
    typeof names[index] === "string" ? names[index].trim().slice(0, MAX_NOTE_NAME_LENGTH) : "",
  );
}

/** What a column is called: for a Notes column the name the user gave it. */
export function columnLabel(column, noteNames) {
  return (column.note !== undefined && noteNames[column.note]) || column.label;
}
