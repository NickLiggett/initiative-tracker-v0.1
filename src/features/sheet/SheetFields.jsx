import { Box, Chip, Paper, Typography } from "@mui/material";
import { Circle, CircleOutlined, StarRate } from "@mui/icons-material";
import {
  ABILITIES,
  DEFENSE_LISTS,
  PASSIVES,
  PERSONAL_LINES,
  PERSONAL_TEXTS,
  SKILLS,
  TRAINING_LISTS,
  abilityModifier,
  passiveScore,
  proficiencyBonus,
  saveBonus,
  signed,
  skillBonus,
  skillLevel,
  withSaveToggled,
  withSkillCycled,
} from "./sheetModel";
import { adjustmentText } from "./sheetAdjust";
import SheetLists from "./SheetLists";
import { RestBar, SheetResources, SheetSpells } from "./SheetSpells";

const dash = (value) => (value === null || value === undefined ? "—" : value);

/** A titled box of the sheet. */
function Section({ title, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: 2, display: "grid", gap: 1, alignContent: "start" }}>
      <Typography variant="subtitle2" component="h2">
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** Marks how proficient: empty circle, filled circle, or a star for expertise. */
function Mark({ level }) {
  const title = level === "none" ? "Not proficient" : level === "proficient" ? "Proficient" : "Expertise";
  return level === "expertise" ? (
    <StarRate fontSize="inherit" color="primary" titleAccess={title} />
  ) : level === "proficient" ? (
    <Circle fontSize="inherit" color="primary" titleAccess={title} />
  ) : (
    <CircleOutlined fontSize="inherit" color="disabled" titleAccess={title} />
  );
}

/**
 * A line of saves, skills or passive scores. `adjustment` is what was adjusted by hand (see sheetAdjust.js), shown beside the
 * label. With `onMark` the mark is a button that takes the proficiency one step on.
 */
function Row({ mark, label, value, adjustment, onMark, markLabel }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {onMark ? (
        <Box
          component="button"
          type="button"
          aria-label={markLabel}
          onClick={onMark}
          sx={{ all: "unset", cursor: "pointer", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1, "&:hover, &:focus-visible": { bgcolor: "action.hover" } }}
        >
          {mark}
        </Box>
      ) : (
        <Box sx={{ width: 22, display: "flex", justifyContent: "center" }}>{mark}</Box>
      )}
      <Typography variant="body2" sx={{ flex: 1 }}>
        {label}
        {adjustment && (
          <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }} aria-label={`Adjusted: ${adjustment}`}>
            ({adjustment})
          </Typography>
        )}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
        {value}
      </Typography>
    </Box>
  );
}

/** A list of text as chips, or nothing at all when it is empty. */
function Tags({ label, items }) {
  if (!items?.length) {
    return null;
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box component="ul" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {items.map((item) => (
          <Box component="li" key={item}>
            <Chip size="small" label={item} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * What the sheet holds beyond hit points and the ability scores (see SheetAbilities): saving throws, skills and passive
 * scores worked out from them and the character's level, then speed, senses, defenses, what the character is trained in, and
 * the personal details. A part with nothing in it is not shown.
 *
 * @param {object} sheet the character's `sheet`
 * @param {number} level the character's level, for the proficiency bonus
 * @param {(sheet: object) => void} [onChange] given the sheet as it would be after a use is spent, a rest taken or a
 *   proficiency changed, to save; without it they are only shown
 */
export default function SheetFields({ sheet, level, onChange }) {
  const filled = ABILITIES.some(({ key }) => abilityModifier(sheet, key) !== null);
  const speed = sheet.speed ?? {};
  const speedText = [speed.walk !== undefined ? `Walking ${speed.walk} ft.` : null, speed.other].filter(Boolean).join(" · ");
  const defenses = DEFENSE_LISTS.filter(({ key }) => sheet.defenses?.[key]?.length);
  const training = TRAINING_LISTS.filter(({ key }) => sheet.training?.[key]?.length);
  const lines = PERSONAL_LINES.filter(({ key }) => sheet.personal?.[key]);
  const texts = PERSONAL_TEXTS.filter(({ key }) => sheet.personal?.[key]);

  return (
    <>
      {filled && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <Section title="Saving throws">
            {ABILITIES.map(({ key, label }) => (
              <Row
                key={key}
                mark={<Mark level={(sheet.saves ?? []).includes(key) ? "proficient" : "none"} />}
                onMark={onChange && (() => onChange(withSaveToggled(sheet, key)))}
                markLabel={`${label} saving throw proficiency: ${(sheet.saves ?? []).includes(key) ? "proficient" : "none"}. Change`}
                label={label}
                adjustment={adjustmentText(sheet, `save.${key}`)}
                value={dash(saveBonus(sheet, key, level) === null ? null : signed(saveBonus(sheet, key, level)))}
              />
            ))}
          </Section>
          <Section title="Skills">
            {SKILLS.map(({ key, label, ability }) => (
              <Row
                key={key}
                mark={<Mark level={skillLevel(sheet, key)} />}
                onMark={onChange && (() => onChange(withSkillCycled(sheet, key)))}
                markLabel={`${label} proficiency: ${skillLevel(sheet, key)}. Change`}
                label={`${label} (${ability.toUpperCase()})`}
                adjustment={adjustmentText(sheet, `skill.${key}`)}
                value={dash(skillBonus(sheet, key, level) === null ? null : signed(skillBonus(sheet, key, level)))}
              />
            ))}
          </Section>
          <Section title="Senses and speed">
            {PASSIVES.map(({ skill, label }) => (
              <Row key={skill} label={label} adjustment={adjustmentText(sheet, `passive.${skill}`)} value={dash(passiveScore(sheet, skill, level))} />
            ))}
            {speedText && <Typography variant="body2">{speedText}</Typography>}
            <Tags label="Senses" items={sheet.senses} />
          </Section>
        </Box>
      )}
      {!filled && (speedText || sheet.senses?.length) && (
        <Section title="Senses and speed">
          {speedText && <Typography variant="body2">{speedText}</Typography>}
          <Tags label="Senses" items={sheet.senses} />
        </Section>
      )}

      <RestBar sheet={sheet} onChange={onChange} />
      <SheetLists sheet={sheet} onChange={onChange} />
      <SheetResources sheet={sheet} onChange={onChange} />
      <SheetSpells sheet={sheet} level={level} onChange={onChange} />

      {defenses.length > 0 && (
        <Section title="Defenses">
          {defenses.map(({ key, label }) => (
            <Tags key={key} label={label} items={sheet.defenses[key]} />
          ))}
        </Section>
      )}
      {training.length > 0 && (
        <Section title="Proficiencies and training">
          {training.map(({ key, label }) => (
            <Tags key={key} label={label} items={sheet.training[key]} />
          ))}
        </Section>
      )}
      {(lines.length > 0 || texts.length > 0) && (
        <Section title="Personal">
          {lines.length > 0 && (
            <Typography variant="body2">{lines.map(({ key, label }) => `${label}: ${sheet.personal[key]}`).join(" · ")}</Typography>
          )}
          {texts.map(({ key, label }) => (
            <Box key={key}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {sheet.personal[key]}
              </Typography>
            </Box>
          ))}
        </Section>
      )}
    </>
  );
}
