import { useState } from "react";
import { Box, Button, ButtonGroup, Chip, Typography } from "@mui/material";
import { Casino } from "@mui/icons-material";
import { formatDice, rollD20, rollDice } from "../../utils/dice";
import { formatModifier } from "./creatureFormat";
import { parseAction } from "./attackParse";

const MODE_WORDS = { advantage: " with advantage", disadvantage: " with disadvantage", normal: "" };

/** "Attack 17: d20 12 + 5", or "Attack 17: d20 4, 12 → 12 + 5" when two were rolled. */
function describeAttack(roll, mode) {
  const dice = roll.rolls.length > 1 ? `${roll.rolls.join(", ")} → ${roll.natural}` : `${roll.natural}`;
  return `Attack${MODE_WORDS[mode]} ${roll.total}: d20 ${dice} ${roll.bonus < 0 ? "-" : "+"} ${Math.abs(roll.bonus)}`;
}

/** "Damage 20: 13 piercing (2d10 + 2: 9, 2) + 7 fire (2d6: 3, 4)" */
function describeDamageRoll(terms, critical) {
  const total = terms.reduce((sum, term) => sum + term.total, 0);
  const parts = terms.map((term) => {
    const type = term.type ? ` ${term.type}` : "";
    return term.dice ? `${term.total}${type} (${formatDice(term.dice)}: ${term.rolls.join(", ")})` : `${term.total}${type}`;
  });
  return `${critical ? "Critical damage" : "Damage"} ${total}: ${parts.join(" + ")}`;
}

/**
 * Buttons that roll an action's attack and damage, read from its text; nothing at all for an action that has neither.
 * An attack roll can be made with advantage or disadvantage, and damage can be rolled for a critical hit (the dice twice).
 *
 * @param {string} name the action's name, to tell its buttons apart from the next one's
 * @param {string} desc the action's text
 * @param {() => number} [random] the dice, for tests
 */
export default function AttackRoller({ name, desc, random = Math.random }) {
  const parsed = parseAction(desc);
  const [result, setResult] = useState(null); // {text, natural}
  if (!parsed.attack && parsed.damage.length === 0) {
    return null;
  }

  const attack = (mode) => {
    const roll = rollD20(parsed.attack.toHit, { mode, random });
    setResult({ text: describeAttack(roll, mode), natural: roll.natural });
  };
  const damage = (critical) => {
    const terms = parsed.damage.map((term) => ({
      type: term.type,
      dice: term.dice,
      ...(term.dice ? rollDice(term.dice, { random, critical }) : { total: term.average, rolls: [] }),
    }));
    setResult({ text: describeDamageRoll(terms, critical), natural: null });
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
      {parsed.attack && (
        <ButtonGroup size="small" variant="outlined" aria-label={`Attack rolls for ${name}`}>
          <Button startIcon={<Casino />} aria-label={`Roll attack for ${name}`} onClick={() => attack("normal")}>
            Attack {formatModifier(parsed.attack.toHit)}
          </Button>
          <Button aria-label={`Roll attack for ${name} with advantage`} onClick={() => attack("advantage")}>
            Adv.
          </Button>
          <Button aria-label={`Roll attack for ${name} with disadvantage`} onClick={() => attack("disadvantage")}>
            Dis.
          </Button>
        </ButtonGroup>
      )}
      {parsed.damage.length > 0 && (
        <ButtonGroup size="small" variant="outlined" aria-label={`Damage rolls for ${name}`}>
          <Button startIcon={parsed.attack ? undefined : <Casino />} aria-label={`Roll damage for ${name}`} onClick={() => damage(false)}>
            Damage
          </Button>
          {parsed.attack && (
            <Button aria-label={`Roll critical damage for ${name}`} onClick={() => damage(true)}>
              Crit
            </Button>
          )}
        </ButtonGroup>
      )}
      {result && (
        <Typography role="status" variant="body2" component="span">
          {result.text}
          {result.natural === 20 && <Chip size="small" color="success" label="Natural 20: a critical hit" sx={{ ml: 1 }} />}
          {result.natural === 1 && <Chip size="small" color="error" label="Natural 1: a miss" sx={{ ml: 1 }} />}
        </Typography>
      )}
    </Box>
  );
}
