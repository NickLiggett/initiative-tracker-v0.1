import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Button } from "@mui/material";

/** The grid's toolbar: step the turn order back or forward. */
export default function GridToolbar({ onPrevious, onNext }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
      <Button onClick={onPrevious} aria-label="Previous turn">
        <KeyboardArrowDownIcon />
      </Button>
      <Button onClick={onNext} aria-label="Next turn">
        <KeyboardArrowUpIcon />
      </Button>
    </div>
  );
}
