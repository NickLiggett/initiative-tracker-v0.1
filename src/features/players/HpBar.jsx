import { Box, Typography } from "@mui/material";
import { hpBar, hpState, vitalsOf } from "./vitals";

const COLOURS = { healthy: "success.main", hurt: "warning.main", bloodied: "error.main" };

/**
 * A character's hit points as a bar: the part that is left in a colour that says how hurt they are, then any temporary
 * hit points in blue, and the figures beside it. Nothing but the figure for a character with no maximum.
 */
export default function HpBar({ player }) {
  const vitals = vitalsOf(player);
  const bar = hpBar(player, vitals);
  const max = player.hitPoints;
  if (!bar) {
    return (
      <Typography variant="body2" color="text.secondary">
        Hit points {vitals.currentHp ?? "—"}
        {vitals.tempHp > 0 && ` (+${vitals.tempHp} temporary)`}
      </Typography>
    );
  }
  const label = `Hit points ${vitals.currentHp} of ${max}${vitals.tempHp > 0 ? `, ${vitals.tempHp} temporary` : ""}`;
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          HP
        </Typography>
        <Typography variant="body2">
          <strong>{vitals.currentHp}</strong> / {max}
          {vitals.tempHp > 0 && (
            <Typography component="span" variant="body2" color="info.main">
              {" "}
              +{vitals.tempHp} temp
            </Typography>
          )}
        </Typography>
      </Box>
      <Box
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={vitals.currentHp}
        sx={{ display: "flex", height: 12, borderRadius: 1, overflow: "hidden", bgcolor: "action.disabledBackground" }}
      >
        <Box sx={{ width: `${bar.current}%`, bgcolor: COLOURS[hpState(max, vitals.currentHp)] }} />
        <Box sx={{ width: `${bar.temp}%`, bgcolor: "info.main" }} />
      </Box>
    </Box>
  );
}
