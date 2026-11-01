import { Box, ButtonBase, Typography } from "@mui/material";
import { MAX_EXHAUSTION } from "./vitals";

/**
 * Exhaustion as a bar of six steps that fill up with each level, tapped to set the level; tapping the level it is at lowers
 * it by one, and the bar empties to none. Each step is darker than the last, as each level is worse.
 *
 * @param {number} level 0 to 6
 * @param {(level: number) => void} onChange
 * @param {boolean} [disabled]
 */
export default function ExhaustionMeter({ level, onChange, disabled }) {
  return (
    <Box sx={{ display: "grid", gap: 0.5, maxWidth: 360 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="subtitle2" component="p" id="exhaustion-label">
          Exhaustion
        </Typography>
        <Typography variant="body2" color={level >= MAX_EXHAUSTION ? "error" : "text.secondary"}>
          {level === 0 ? "None" : level >= MAX_EXHAUSTION ? "Level 6, death" : `Level ${level}`}
        </Typography>
      </Box>
      <Box role="group" aria-labelledby="exhaustion-label" sx={{ display: "flex", gap: 0.5 }}>
        {Array.from({ length: MAX_EXHAUSTION }, (_, index) => {
          const step = index + 1;
          const filled = level >= step;
          return (
            <ButtonBase
              key={step}
              disabled={disabled}
              aria-label={`Exhaustion level ${step}`}
              aria-pressed={filled}
              onClick={() => onChange(level === step ? step - 1 : step)}
              sx={{
                flex: 1,
                height: 18,
                borderRadius: 0.5,
                border: 1,
                borderColor: filled ? "transparent" : "divider",
                bgcolor: filled ? `hsl(${40 - index * 8}, 85%, ${55 - index * 5}%)` : "action.hover",
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
