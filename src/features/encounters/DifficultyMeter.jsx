import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import { difficulty2014, difficulty2024 } from "./encounterRules";

const COLORS = { Trivial: "inherit", Low: "success", Easy: "success", Moderate: "info", Medium: "info", High: "warning", Hard: "warning", Deadly: "error", "Over budget": "error" };

const number = (value) => value.toLocaleString();

/**
 * How hard the encounter is for the party, by the chosen rules: a label, the numbers it comes from, and where the
 * encounter's XP sits against each threshold (2014) or budget (2024).
 *
 * @param {string} ruleset "5e-2014" or "5e-2024"
 * @param {number[]} levels each character's level
 * @param {{xp: number, count: number}[]} monsters
 */
export default function DifficultyMeter({ ruleset, levels, monsters }) {
  const old = ruleset === "5e-2014";
  const result = old ? difficulty2014(levels, monsters) : difficulty2024(levels, monsters);
  const tiers = old
    ? [["Easy", result.thresholds.easy], ["Medium", result.thresholds.medium], ["Hard", result.thresholds.hard], ["Deadly", result.thresholds.deadly]]
    : [["Low", result.budgets.low], ["Moderate", result.budgets.moderate], ["High", result.budgets.high]];
  const top = tiers.at(-1)[1];
  const compared = old ? result.adjustedXp : result.xp;
  const empty = result.label === "—";
  const color = COLORS[result.label] ?? "inherit";

  return (
    <Box component="section" aria-label="Difficulty">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6" component="h2">
          Difficulty
        </Typography>
        <Chip role="status" label={empty ? "Add a party and creatures" : result.label} color={color === "inherit" ? "default" : color} />
      </Box>

      {!empty && (
        <>
          <Typography sx={{ mt: 1 }}>
            {old
              ? `${number(result.xp)} XP × ${result.multiplier} for the number of monsters = ${number(result.adjustedXp)} adjusted XP`
              : `${number(result.xp)} XP of monsters`}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={top > 0 ? Math.min(100, (compared / top) * 100) : 0}
            color={color === "inherit" ? "primary" : color}
            aria-label="XP against the hardest threshold"
            sx={{ height: 10, borderRadius: 5, my: 1 }}
          />
        </>
      )}

      <Box component="dl" sx={{ display: "flex", gap: 3, flexWrap: "wrap", m: 0 }}>
        {tiers.map(([name, value]) => (
          <Box key={name}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {name}
            </Typography>
            <Typography component="dd" sx={{ m: 0, fontWeight: !empty && result.label === name ? "bold" : "normal" }}>
              {number(value)} XP
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
