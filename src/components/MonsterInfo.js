import { useState } from "react";
import { Dialog, DialogTitle, Tab, Tabs, Box } from "@mui/material";

import GeneralTabPanel from "./GeneralTabPanel";
import SkillsTabPanel from "./SkillsTabPanel";
import ActionsTabPanel from "./ActionsTabPanel";

const MonsterInfo = ({
  showMonsterModal,
  setShowMonsterModal,
  monsterInfo,
}) => {
  const [tabValue, setTabValue] = useState(1);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={showMonsterModal}
      onClose={() => setShowMonsterModal(false)}
    >
      <DialogTitle
        style={{
          textAlign: "center",
          fontSize: 30,
          fontWeight: "bolder",
        }}
      >
        {monsterInfo.name}
      </DialogTitle>
      <Box
        sx={{
          height: "50em",
          width: "100%",
          minWidth: 600,
          overflow: "auto"
        }}
      >
        <Tabs value={tabValue} onChange={handleChange}>
          <Tab value={1} label="General" style={{ flex: 1 }} />
          <Tab value={2} label="Skills" style={{ flex: 1 }} />
          <Tab value={3} label="Actions" style={{ flex: 1 }} />
        </Tabs>
        <GeneralTabPanel value={tabValue} index={1} monsterInfo={monsterInfo} />
        <SkillsTabPanel value={tabValue} index={2} monsterInfo={monsterInfo} />
        <ActionsTabPanel value={tabValue} index={3} monsterInfo={monsterInfo} />
      </Box>
    </Dialog>
  );
};

export default MonsterInfo;
