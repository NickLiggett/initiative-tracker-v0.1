import { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { searchClasses } from "../../api/classes";

/**
 * The subclass of a character's class: a name to type or pick from the class's subclasses (those the user can see, so
 * homebrew ones too). Picking one, or typing its name, keeps its key, so that its features can be listed on the sheet.
 *
 * @param {string} classKey the class the subclass is of
 * @param {string} label
 * @param {string} value the name
 * @param {(change: {subclassName: string, subclassKey: ?string}) => void} onChange
 * @param {boolean} [disabled]
 */
export default function SubclassField({ classKey, label, value, onChange, disabled }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    setOptions([]);
    searchClasses("", { subclassOf: classKey, pageSize: 100, signal: controller.signal })
      .then((found) => setOptions(found ?? []))
      .catch(() => {}); // the name can still be typed
    return () => controller.abort();
  }, [classKey]);

  const named = (name) => options.find((option) => option.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <Autocomplete
      freeSolo
      size="small"
      disabled={disabled}
      options={options}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      renderOption={(props, option) => (
        <li {...props} key={option.key}>
          {option.name}
        </li>
      )}
      inputValue={value}
      onInputChange={(event, next) => next !== value && onChange({ subclassName: next, subclassKey: named(next)?.key ?? null })}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ flex: 1 }}
    />
  );
}
