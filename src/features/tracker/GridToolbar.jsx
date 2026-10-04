import { KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";

const SAVE_TEXT = {
  loading: "Loading your tracker…",
  saving: "Saving…",
  saved: "Saved to your account",
  off: "Not saved: couldn't reach your account",
};

/**
 * The grid's toolbar: step the turn order back or forward, with whether the tracker is saved to the account between.
 * @param {"loading"|"saving"|"saved"|"failed"|"off"} saveStatus see useSavedTracker
 * @param {?string} notice something to tell the user about what was loaded
 */
export default function GridToolbar({ onPrevious, onNext, saveStatus, notice, onRetry }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <Button onClick={onPrevious} aria-label="Previous turn">
        <KeyboardArrowDownIcon />
      </Button>
      <div style={{ textAlign: "center" }}>
        {saveStatus === "failed" ? (
          <Button size="small" color="warning" onClick={onRetry}>
            Couldn't save: try again
          </Button>
        ) : (
          saveStatus && (
            <Typography variant="caption" color="text.secondary" role="status">
              {SAVE_TEXT[saveStatus]}
            </Typography>
          )
        )}
        {notice && (
          <Typography variant="caption" color="warning.main" component="div">
            {notice}
          </Typography>
        )}
      </div>
      <Button onClick={onNext} aria-label="Next turn">
        <KeyboardArrowUpIcon />
      </Button>
    </div>
  );
}
