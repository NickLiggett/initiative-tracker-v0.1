import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { InventoryPanel } from "../players/InventoryDialog";
import { SheetDescription } from "./SheetFields";
import SheetLists from "./SheetLists";
import { RestBar, SheetResources, SheetSpells } from "./SheetSpells";

const TABS = ["Actions", "Spells", "Inventory", "Features", "Description"];

const hint = (text) => (
  <Typography color="text.secondary" sx={{ py: 1 }}>
    {text}
  </Typography>
);

/**
 * What a character has and does, in tabs as on D&D Beyond: Actions (attacks), Spells (slots, hit dice and the spell list),
 * Inventory, Features (with their uses) and Description (defenses, training, who they are and the notes). The rest buttons
 * sit above the tabs, since a rest gives back things on several of them.
 *
 * @param {object} player as the backend gives it
 * @param {(sheet: object) => void} [onChange] saves the sheet after a use is spent, a rest taken or a spell prepared; without
 *   it the sheet is only read
 */
export default function SheetTabs({ player, onChange }) {
  const [tab, setTab] = useState("Actions");
  const sheet = player.sheet ?? {};
  const casts = sheet.spells?.length || sheet.spellcasting || Object.keys(sheet.slots ?? {}).length || sheet.pact || sheet.hitDice;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <RestBar sheet={sheet} onChange={onChange} />
      <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Character sheet sections">
        {TABS.map((name) => (
          <Tab key={name} value={name} label={name} id={`sheet-tab-${name}`} aria-controls={`sheet-panel-${name}`} />
        ))}
      </Tabs>
      <Box role="tabpanel" id={`sheet-panel-${tab}`} aria-labelledby={`sheet-tab-${tab}`} sx={{ display: "grid", gap: 2 }}>
        {tab === "Actions" && (sheet.attacks?.length || onChange ? <SheetLists sheet={sheet} onChange={onChange} show="attacks" /> : hint("No attacks."))}
        {tab === "Spells" && (
          <>
            <SheetResources sheet={sheet} onChange={onChange} />
            <SheetSpells sheet={sheet} level={player.level} onChange={onChange} />
            {!casts && hint("No spells or spell slots yet. Add them with Edit stats.")}
          </>
        )}
        {tab === "Inventory" && (
          <Paper variant="outlined" component="section" aria-label="Inventory" sx={{ p: 2 }}>
            <InventoryPanel player={player} readOnly={player.role === "PARTY"} />
          </Paper>
        )}
        {tab === "Features" && (sheet.features?.length || onChange ? <SheetLists sheet={sheet} onChange={onChange} show="features" /> : hint("No features."))}
        {tab === "Description" && (
          <>
            <SheetDescription sheet={sheet} onChange={onChange} />
            {player.notes && (
              <Paper variant="outlined" component="section" aria-label="Notes" sx={{ p: 2 }}>
                <Typography variant="subtitle2" component="h2" gutterBottom>
                  Notes
                </Typography>
                <Typography sx={{ whiteSpace: "pre-line" }}>{player.notes}</Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
