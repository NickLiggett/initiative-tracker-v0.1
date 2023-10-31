import { Box, Typography } from "@mui/material";

const ActionsTabPanel = (props) => {
  const { children, value, index, monsterInfo, ...other } = props;
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
          <Typography sx={{ fontWeight: "bold", fontSize: 20 }}>
            Actions:
          </Typography>
          {monsterInfo.actions.map((action, index) => {
            return (
              <div key={action.name} style={{ margin: 20 }}>
                <Typography sx={{ fontWeight: "bold" }}>
                  {index + 1}. {action.name}
                </Typography>
                <Typography>{action.desc}</Typography>
              </div>
            );
          })}
          {monsterInfo.legendary_actions.length > 0 && (
            <div>
              <Typography sx={{ fontWeight: "bold", fontSize: 20 }}>
                Legendary Actions:
              </Typography>
              {monsterInfo.legendary_actions.map((action, index) => {
                return (
                    <div key={action.name} style={{ margin: 20 }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {index + 1}. {action.name}
                    </Typography>
                    <Typography>{action.desc}</Typography>
                  </div>
                )
              })}
            </div>
          )}
        </Box>
      )}
    </div>
  );
};

export default ActionsTabPanel;
