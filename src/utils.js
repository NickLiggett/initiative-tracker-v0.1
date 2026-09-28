export const fetchAllMonsters = async () => {
  let response = await fetch("http://localhost:8080/api/creatures");
  let json = await response.json();
  return json;
};

export const fetchMonster = async (index) => {
  let response = await fetch(`http://localhost:8080/api/creatures/${index}`);
  let json = await response.json();
  return json;
};

export const Pages = { INITIATIVE_TRACKER: 'Initiative Tracker', MONSTERS: 'Monsters', PLAYERS: 'Players', SETTINGS: 'Settings' };   