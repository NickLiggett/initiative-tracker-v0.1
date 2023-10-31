import { Box, Typography } from "@mui/material";

const SkillsTabPanel = (props) => {
  const { children, value, index, monsterInfo, ...other } = props;
  const abilityScoreStyles = {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    borderBottom: "1px solid",
    marginTop: 15,
    marginBottom: 15,
  };
  const abilityScoreTitleStyles = { fontWeight: "bolder", fontSize: 20 };

  const calculateAbilityScoreModifier = (abilityScore) => {
    abilityScore = parseInt(abilityScore);
    // Calculate the modifier using the formula
    const modifier = Math.floor((abilityScore - 10) / 2);
    if (modifier > 0) {
      return `+${modifier}`;
    } else if (modifier < 0) {
      return `${modifier}`;
    } else {
      return `+${modifier}`;
    }
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
        <Box sx={{ p: 3 }}>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>Charisma:</Typography>
            <Typography>
              {monsterInfo.charisma}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.charisma)})`}
            </Typography>
          </div>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>
              Constitution:
            </Typography>
            <Typography>
              {monsterInfo.constitution}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.constitution)})`}
            </Typography>
          </div>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>Dexterity:</Typography>
            <Typography>
              {monsterInfo.dexterity}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.dexterity)})`}
            </Typography>
          </div>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>
              Intelligence:
            </Typography>
            <Typography>
              {monsterInfo.intelligence}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.intelligence)})`}
            </Typography>
          </div>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>Strength:</Typography>
            <Typography>
              {monsterInfo.strength}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.strength)})`}
            </Typography>
          </div>
          <div style={abilityScoreStyles}>
            <Typography style={abilityScoreTitleStyles}>Wisdom:</Typography>
            <Typography>
              {monsterInfo.wisdom}{" "}
              {`(${calculateAbilityScoreModifier(monsterInfo.wisdom)})`}
            </Typography>
          </div>{" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginTop: 50,
              borderBottom: "1px solid",
            }}
          >
            <Typography style={{ fontWeight: "bolder" }}>
              Proficiency Bonus:
            </Typography>
            <Typography>{monsterInfo.proficiency_bonus}</Typography>
          </div>
          {monsterInfo.proficiencies.length > 0 && (
            <div>
              <Typography
                style={{ fontSize: 20, fontWeight: "bolder", marginTop: 30 }}
              >
                Proficiencies:{" "}
              </Typography>
              <Typography>
                {monsterInfo.proficiencies.map((prof) => {
                  return (
                    <Typography key={prof.proficiency.name}>
                      {prof.proficiency.name} +{prof.value}
                    </Typography>
                  );
                })}
              </Typography>
            </div>
          )}
          <Typography
            style={{ fontSize: 20, fontWeight: "bolder", marginTop: 30 }}
          >
            Senses:
          </Typography>
          <Typography>
            Passive Perception: {monsterInfo.senses.passive_perception}
          </Typography>
          {monsterInfo.senses.darkvision && (
            <Typography>
              Dark Vision: {monsterInfo.senses.darkvision}
            </Typography>
          )}
          {monsterInfo.senses.blindsight && (
            <Typography>
              Blind Sight: {monsterInfo.senses.blindsight}
            </Typography>
          )}
          {monsterInfo.senses.truesight && (
            <Typography>True Sight: {monsterInfo.senses.truesight}</Typography>
          )}
          <div>
            {monsterInfo.special_abilities.length > 0 && (
              <div>
                <Typography
                  style={{ fontSize: 20, fontWeight: "bolder", marginTop: 30 }}
                >
                  Special Abilities:{" "}
                </Typography>
                <Typography>
                  {monsterInfo.special_abilities.map((ability) => {
                    return (
                      <div key={ability.name}>
                        <Typography
                          style={{ fontWeight: "bolder", marginTop: 15 }}
                        >
                          {ability.name}
                        </Typography>
                        <Typography>{ability.desc}</Typography>
                        {ability.usage && (
                          <Typography>
                            {ability.usage.times} {ability.usage.type}
                          </Typography>
                        )}
                      </div>
                    );
                  })}
                </Typography>
              </div>
            )}
          </div>
        </Box>
      )}
    </div>
  );
};

export default SkillsTabPanel;
