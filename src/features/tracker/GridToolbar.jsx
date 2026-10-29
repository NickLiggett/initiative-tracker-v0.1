import { KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import { Button, Tooltip, Typography } from "@mui/material";

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
 * @param {string} trackerName what the tracker in use is called
 * @param {() => void} onOpenTrackers opens the list of trackers, to start or bring back another
 * @param {() => void} onRevealAll show the players every monster's AC and HP (see the "Players see" column)
 * @param {() => void} onHideAll hide them all again
 */
export default function GridToolbar({ onPrevious, onNext, onRevealAll, onHideAll, saveStatus, notice, onRetry, trackerName, onOpenTrackers }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <Button onClick={onPrevious} aria-label="Previous turn">
        <KeyboardArrowDownIcon />
      </Button>
      <div style={{ textAlign: "center" }}>
        <Button size="small" onClick={onOpenTrackers} aria-label="Trackers">
          {trackerName || "Untitled tracker"} ▾
        </Button>
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
        <div>
          <Button size="small" onClick={onRevealAll}>
            Reveal all
          </Button>
          <Button size="small" onClick={onHideAll}>
            Hide all
          </Button>
        </div>
        {notice && (
          <Typography variant="caption" color="warning.main" component="div">
            {notice}
          </Typography>
        )}
      </div>
      <Tooltip title="Next turn (Space)">
        <Button onClick={onNext} aria-label="Next turn">
          <KeyboardArrowUpIcon />
        </Button>
      </Tooltip>
    </div>
  );
}
