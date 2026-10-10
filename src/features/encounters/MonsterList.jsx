import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Add, Delete, Info, Remove } from "@mui/icons-material";
import { formatChallengeRating } from "../creatures/creatureFormat";
import { creatureXp } from "./encounterRules";

const MAX_COUNT = 99;

/**
 * The creatures in the encounter, each kind with how many of it, what each is worth, and buttons to change the number,
 * see the stat block and remove it.
 *
 * @param {{creature: object, count: number}[]} monsters
 * @param {(key: string, count: number) => void} onCount
 * @param {(key: string) => void} onRemove
 * @param {(creature: object) => void} onShow
 */
export default function MonsterList({ monsters, onCount, onRemove, onShow }) {
  if (monsters.length === 0) {
    return <Typography color="text.secondary">Search for creatures to add to the encounter.</Typography>;
  }
  return (
    <Box component="ul" aria-label="Monsters" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {monsters.map(({ creature, count }) => {
        const xp = creatureXp(creature);
        return (
          <Box component="li" key={creature.key} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ overflowWrap: "anywhere" }}>{creature.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                CR {formatChallengeRating(creature.challengeRating)} · {xp.toLocaleString()} XP each
                {count > 1 ? ` · ${(xp * count).toLocaleString()} XP in all` : ""}
              </Typography>
            </Box>
            <IconButton aria-label={`Fewer ${creature.name}`} disabled={count <= 1} onClick={() => onCount(creature.key, count - 1)}>
              <Remove />
            </IconButton>
            <Typography component="span" aria-label={`Number of ${creature.name}`} sx={{ minWidth: 24, textAlign: "center" }}>
              {count}
            </Typography>
            <IconButton aria-label={`More ${creature.name}`} disabled={count >= MAX_COUNT} onClick={() => onCount(creature.key, count + 1)}>
              <Add />
            </IconButton>
            <Tooltip title="Stat block">
              <IconButton aria-label={`Stat block of ${creature.name}`} onClick={() => onShow(creature)}>
                <Info />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton aria-label={`Remove ${creature.name}`} onClick={() => onRemove(creature.key)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        );
      })}
    </Box>
  );
}
