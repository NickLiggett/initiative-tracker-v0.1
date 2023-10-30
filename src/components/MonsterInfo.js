import { useState } from "react";
import { Dialog, DialogTitle, Tab, Tabs, Box, Typography } from "@mui/material";

const MonsterInfo = ({
  showMonsterModal,
  setShowMonsterModal,
  monsterInfo,
}) => {
  const [tabValue, setTabValue] = useState(1);

  function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            <Typography>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog open={showMonsterModal} onClose={() => setShowMonsterModal(false)}>
      <DialogTitle>{monsterInfo.name}</DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleChange}>
          <Tab value={1} label="General" />
          <Tab value={2} label="Skills" />
          <Tab value={3} label="Actions" />
        </Tabs>
      </Box>
      <CustomTabPanel value={tabValue} index={1}>
        <div>
            <Typography>Alignment: {monsterInfo.alignment.charAt(0).toUpperCase() + monsterInfo.alignment.substring(1)}</Typography>
        </div>
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={2}>
        Item Two
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={3}>
        Item Three
      </CustomTabPanel>
    </Dialog>
  );
};

export default MonsterInfo;
