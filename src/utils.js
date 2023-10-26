export const fetchAllMonsters = async () => {
    let response = await fetch("https://www.dnd5eapi.co/api/monsters")
    let json = await response.json()
    return json
}

export const fetchMonster = async (index) => {
let response = await fetch(`https://www.dnd5eapi.co${index}`)
let json = await response.json()
return json
}