import { Box, Typography } from "@mui/material";

const GeneralTabPanel = (props) => {
  const { children, value, index, monsterInfo, ...other } = props;

  function capitalizeWords(inputString) {
    if (!inputString) {
      return;
    }

    const words = inputString.split(" ");

    const capitalizedWords = words.map((word) => {
      if (word.length > 0) {
        if (word === "and" || word === "from") {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      } else {
        return word;
      }
    });

    const resultString = capitalizedWords.join(" ");

    return resultString;
  }

  function capitalizeFirstLetter(str) {
    if (!str) {
      return;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const genInfoStyles = { fontWeight: "bolder", fontSize: 20 };
  const generalInfoStyles = {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    borderBottom: "1px solid",
    marginTop: 15,
    marginBottom: 15,
  };

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            p: 3,
          }}
        >
          {monsterInfo.desc && (
            <Typography
              style={{ borderBottom: "1px solid black", paddingBottom: "20px" }}
            >
              {monsterInfo.desc}
            </Typography>
          )}
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Hit Points:</Typography>
            <Typography>{monsterInfo.hit_points}</Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Armor Class:</Typography>
            <Typography>{monsterInfo.armor_class[0].value}</Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Challenge Rating:</Typography>
            <Typography>{monsterInfo.challenge_rating}</Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Speed:</Typography>
            <Typography>
              Walking {monsterInfo.speed.walk}
              {monsterInfo.speed.fly && ` - Flying ${monsterInfo.speed.fly}`}
              {monsterInfo.speed.swim &&
                ` - Swimming ${monsterInfo.speed.swim}`}
            </Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Hit Dice:</Typography>
            <Typography>{monsterInfo.hit_dice}</Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Type:</Typography>
            <Typography>{capitalizeFirstLetter(monsterInfo.type)}</Typography>
          </div>
          {monsterInfo.subtype && (
            <div style={generalInfoStyles}>
              <Typography style={genInfoStyles}>Sub-Type:</Typography>
              <Typography>
                {capitalizeFirstLetter(monsterInfo.subtype)}
              </Typography>
            </div>
          )}
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Size:</Typography>
            <Typography>{monsterInfo.size}</Typography>
          </div>
          <div style={generalInfoStyles}>
            <Typography style={genInfoStyles}>Alignment:</Typography>
            <Typography>{capitalizeWords(monsterInfo.alignment)}</Typography>
          </div>
          <div style={{marginTop: 20}}>
            <Typography style={genInfoStyles}>Languages: </Typography>
            <Typography>
              {monsterInfo.languages
                ? capitalizeFirstLetter(monsterInfo.languages)
                : "None"}
            </Typography>
          </div>
          {monsterInfo.condition_immunities.length > 0 && (
            <div style={{marginTop: 20}}>
              <Typography style={genInfoStyles}>
                Condition Immunities:{" "}
              </Typography>
              <Typography>
                {monsterInfo.condition_immunities.map((imun, index) => {
                  if (index + 1 === monsterInfo.condition_immunities.length) {
                    return `${imun.name}`;
                  }
                  return `${imun.name}, `;
                })}
              </Typography>
            </div>
          )}
          {monsterInfo.damage_immunities.length > 0 && (
            <div style={{marginTop: 20}}>
              <Typography style={genInfoStyles}>Damage Immunities: </Typography>
              <Typography>
                {monsterInfo.damage_immunities.map((imun, index) => {
                  if (index + 1 === monsterInfo.damage_immunities.length) {
                    return `${capitalizeWords(imun)}`;
                  }
                  return `${capitalizeWords(imun)}, `;
                })}
              </Typography>
            </div>
          )}
          {monsterInfo.damage_resistances.length > 0 && (
            <div style={{marginTop: 20}}>
              <Typography style={genInfoStyles}>
                Damage Resistances:{" "}
              </Typography>
              <Typography>
                {monsterInfo.damage_resistances.map((res, index) => {
                  if (index + 1 === monsterInfo.damage_resistances.length) {
                    return `${capitalizeWords(res)}`;
                  }
                  return `${capitalizeWords(res)}, `;
                })}
              </Typography>
            </div>
          )}
        </Box>
      )}
    </div>
  );
};
export default GeneralTabPanel;
