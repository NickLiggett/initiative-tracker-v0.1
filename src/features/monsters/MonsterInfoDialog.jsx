import { useState } from "react";
import { Box, Dialog, DialogTitle, Tab, Tabs, Typography } from "@mui/material";
import GeneralTab from "./GeneralTab";
import SkillsTab from "./SkillsTab";
import ActionsTab from "./ActionsTab";

/** A creature's stat block, in tabs. */
export default function MonsterInfoDialog({ open, onClose, creature }) {
  const [tab, setTab] = useState(1);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle style={{ textAlign: "center", fontSize: 30, fontWeight: "bolder" }}>
        {creature.name}
        {creature.document?.displayName && (
          <Typography component="span" display="block" color="text.secondary">
            {creature.document.displayName}
          </Typography>
        )}
      </DialogTitle>
      <Box sx={{ height: "50em", width: "100%", minWidth: 600, overflow: "auto" }}>
        <Tabs value={tab} onChange={(event, value) => setTab(value)}>
          <Tab value={1} label="General" id="monster-tab-1" style={{ flex: 1 }} />
          <Tab value={2} label="Skills" id="monster-tab-2" style={{ flex: 1 }} />
          <Tab value={3} label="Actions" id="monster-tab-3" style={{ flex: 1 }} />
        </Tabs>
        <GeneralTab value={tab} index={1} creature={creature} />
        <SkillsTab value={tab} index={2} creature={creature} />
        <ActionsTab value={tab} index={3} creature={creature} />
      </Box>
    </Dialog>
  );
}
