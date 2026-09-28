import { Typography } from "@mui/material";
import { ACTION_TYPES, actionsOfType, formatUsageLimits } from "./creatureFormat";
import { SectionHeading, TabPanel } from "./TabPanel";

export default function ActionsTab({ value, index, creature }) {
  return (
    <TabPanel value={value} index={index}>
      {ACTION_TYPES.map(({ type, heading }) => {
        const actions = actionsOfType(creature, type);
        if (actions.length === 0) {
          return null;
        }
        return (
          <div key={type}>
            <SectionHeading>{heading}:</SectionHeading>
            {actions.map((action, position) => (
              <div key={`${action.name}-${position}`} style={{ margin: 20 }}>
                <Typography sx={{ fontWeight: "bold" }}>
                  {position + 1}. {action.name}
                  {actionNotes(action)}
                </Typography>
                <Typography style={{ whiteSpace: "pre-line" }}>{action.desc}</Typography>
              </div>
            ))}
          </div>
        );
      })}
    </TabPanel>
  );
}

/** " (Recharge 5–6; costs 2 actions)" */
function actionNotes(action) {
  const notes = [formatUsageLimits(action.usageLimits), action.limitedToForm];
  if (action.actionType === "LEGENDARY_ACTION" && action.legendaryActionCost > 1) {
    notes.push(`costs ${action.legendaryActionCost} actions`);
  }
  const text = notes.filter(Boolean).join("; ");
  return text ? ` (${text})` : "";
}
