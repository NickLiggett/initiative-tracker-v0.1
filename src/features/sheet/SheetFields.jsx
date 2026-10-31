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
import EditableField from "./EditableField";
import { adjustmentText } from "./sheetAdjust";
import { withListEntry, withOtherSpeed, withPersonal, withSenses } from "./sheetEdits";

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

/** The other speeds and the senses: as text, or, when the sheet can be changed, each with a pencil (and shown even when empty). The walking speed is changed in the header. */
function SpeedAndSenses({ sheet, speedText, onChange }) {
  if (!onChange) {
    return (
      <>
        {speedText && <Typography variant="body2">{speedText}</Typography>}
        <Tags label="Senses" items={sheet.senses} />
      </>
    );
  }
  const speed = sheet.speed ?? {};
  const none = (text) => (
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  );
  return (
    <>
      {speed.walk !== undefined && <Typography variant="body2">Walking {speed.walk} ft.</Typography>}
      <EditableField label="Other speeds" value={speed.other ?? ""} hint="Such as fly 30 ft., swim 30 ft." onSave={(text) => onChange(withOtherSpeed(sheet, text))}>
        {speed.other ? <Typography variant="body2">{speed.other}</Typography> : none("No other speeds")}
      </EditableField>
      <EditableField label="Senses" value={(sheet.senses ?? []).join("\n")} multiline hint="One a line, such as Darkvision 120 ft." onSave={(text) => onChange(withSenses(sheet, text))}>
        {sheet.senses?.length ? <Tags label="Senses" items={sheet.senses} /> : none("No senses")}
      </EditableField>
    </>
  );
}

/**
 * Saving throws, skills and passive scores worked out from the ability scores (see SheetAbilities) and the character's
 * level, and speed and senses. Proficiencies can be changed from their marks. The rest of the sheet is in SheetTabs.
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

  return (
    <>
      {filled && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
          <Box sx={{ display: "grid", gap: 2 }}>
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
          </Box>
          <Section title="Senses and speed">
            {PASSIVES.map(({ skill, label }) => (
              <Row key={skill} label={label} adjustment={adjustmentText(sheet, `passive.${skill}`)} value={dash(passiveScore(sheet, skill, level))} />
            ))}
            <SpeedAndSenses sheet={sheet} speedText={speedText} onChange={onChange} />
          </Section>
        </Box>
      )}
      {!filled && (speedText || sheet.senses?.length || onChange) && (
        <Section title="Senses and speed">
          <SpeedAndSenses sheet={sheet} speedText={speedText} onChange={onChange} />
        </Section>
      )}

    </>
  );
}

/**
 * Defenses, what the character is trained in, and the personal details. Read only, a part with nothing in it is not shown;
 * with `onChange` (given the sheet after a change, to save) every part is shown with a pencil beside it.
 */
export function SheetDescription({ sheet, onChange }) {
  const editable = Boolean(onChange);
  const defenses = DEFENSE_LISTS.filter(({ key }) => editable || sheet.defenses?.[key]?.length);
  const training = TRAINING_LISTS.filter(({ key }) => editable || sheet.training?.[key]?.length);
  const lines = PERSONAL_LINES.filter(({ key }) => editable || sheet.personal?.[key]);
  const texts = PERSONAL_TEXTS.filter(({ key }) => editable || sheet.personal?.[key]);
  const empty = (label) => (
    <Typography variant="body2" color="text.secondary">
      {label}: none
    </Typography>
  );
  const list = (group, { key, label }) => (
    <EditableField key={key} label={label} value={(sheet[group]?.[key] ?? []).join("\n")} multiline hint="One a line" onSave={onChange && ((text) => onChange(withListEntry(sheet, group, key, text)))}>
      {sheet[group]?.[key]?.length ? <Tags label={label} items={sheet[group][key]} /> : empty(label)}
    </EditableField>
  );

  return (
    <>
      {defenses.length > 0 && <Section title="Defenses">{defenses.map((one) => list("defenses", one))}</Section>}
      {training.length > 0 && <Section title="Proficiencies and training">{training.map((one) => list("training", one))}</Section>}
      {(lines.length > 0 || texts.length > 0) && (
        <Section title="Personal">
          {editable ? (
            <Box sx={{ display: "grid", gap: 0.5, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {lines.map(({ key, label }) => (
                <EditableField key={key} label={label} value={sheet.personal?.[key] ?? ""} onSave={(text) => onChange(withPersonal(sheet, key, text))}>
                  <Typography variant="body2" color={sheet.personal?.[key] ? "text.primary" : "text.secondary"}>
                    {label}: {sheet.personal?.[key] || "—"}
                  </Typography>
                </EditableField>
              ))}
            </Box>
          ) : (
            lines.length > 0 && <Typography variant="body2">{lines.map(({ key, label }) => `${label}: ${sheet.personal[key]}`).join(" · ")}</Typography>
          )}
          {texts.map(({ key, label }) => (
            <EditableField key={key} label={label} value={sheet.personal?.[key] ?? ""} multiline onSave={onChange && ((text) => onChange(withPersonal(sheet, key, text)))}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" color={sheet.personal?.[key] ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-line" }}>
                  {sheet.personal?.[key] || "—"}
                </Typography>
              </Box>
            </EditableField>
          ))}
        </Section>
      )}
    </>
  );
}
