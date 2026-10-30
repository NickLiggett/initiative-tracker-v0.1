# Remaining to do

What is left from `New Initiative Tracker Feedback 10-25-2026.docx`, as of 2026-10-29. Everything else in the
feedback has been built (see "Done" at the bottom).

Each item that stores a new setting on the account needs a backend change in `open5e-backend` first. The backend
branch is merged and deployed before the frontend branch that uses it.

## To check after the redeploy

These are built and tested in code but have not been tried in a browser. Please check by hand:

- **HP column:** double-click an HP cell, type `-5`, click Next turn. Counting up (Settings > Tracker), `+7` adds damage.
- **Temp HP:** with Temp HP on, `-3` in the HP column uses up temp HP before the row's own. Setting HP to a plain number leaves temp HP alone.
- **Columns:** Settings > Tracker > Columns: turn Notes columns on and name one, try the Edit button, try Reset to defaults.
- **Hiding from players:** the eye in the Name, AC and HP cells and in each column heading; then Player View as a party member (hidden name shows "Unknown creature").
- **Undo/redo:** delete a row, Ctrl+Z, Ctrl+Y; the Undo prompt after a delete or Clear. Ctrl+Z inside a cell being edited should undo the typing, not the row.
- **Right-click and long-press** on a row (Edit, Delete); long-press needs a touch screen.
- **Sources and saved filters:** the Sources box on each page and beside the creature search in the tracker and Encounters; save, apply, replace and delete a saved filter.
- **Fonts and favorites:** font and text size in Settings > Appearance; star pages in the drawer.
- **Saved trackers:** start a new tracker, bring the old one back, and check Player View's Tracker list.

## Still to build

1. **Passive initiative toggle.** Small. Show or hide a passive initiative (10 + bonus) for rows, probably a column
   choice in Settings > Tracker > Columns. Decide where the number comes from for creatures with no initiative bonus.
2. **Favorite content in the drawer.** Favorite *pages* are done. Favorite creatures, spells, items and so on would be
   starred on their stat block, listed in the drawer, and open their page with that thing already shown. Needs a
   `favorites` setting on the account and a way for a page to open on a given item.
3. **Cross-page "my sources" preset.** Saved filters are per page. A preset of sources (for example "only SRD and my
   homebrew") that applies everywhere would be a separate setting. Not requested yet; add only if wanted.
4. **Stale-tab save check (backend).** Two tabs, or a failed save, can overwrite a newer tracker with an older one.
   The fix is a version on the saved tracker: the backend answers 409 when the version sent is not the current one, and
   the app reloads or tells the user. Possible cause of the earlier report of HP and AC resetting to the creature's
   originals. Deferred earlier; worth doing before more people use the tracker.

## Tabled

- **Background gallery** (planned for Settings > Appearance) and **image crop.** Tabled by choice. Needs details from
  the feedback doc first: where the images come from (supplied or uploaded), and where the background shows. The name
  collides with the existing 5e Backgrounds page, so call it something else (for example "Page backgrounds").

## Not part of the app

- **Sign-out time.** A Keycloak setting (the session and token lifespans), not something the app controls.

## Open questions

- Should **Delete** from the row menu ask first? It does not, since Undo covers it.
- Should the Notes columns, Temp HP and Damage taken show in Player View? They do not (DM only).
- Is there an outstanding answer on **Items'** purpose, from the feedback ("Items purpose")? Not yet looked at.
- The legendary action and resistance checkboxes are still not saved between sessions (as before).

## Done

Merged: quick wins (confirm Clear, Player View name, page descriptions); saved trackers; row menu and editor, make a
row a character, count up or down HP; configurable columns (Temp HP, Damage taken, three named Notes columns, Edit
button, Reset to defaults); hide name, AC and HP from players one by one; undo and redo; source filters on every page
and saved named filters; the fix for an open cell edit being lost when a toolbar or footer button was clicked; fonts and
text size; favorite pages in the drawer.

Built, branches ready to push (backend first), each on top of the one before: multiclass characters, every source in
the class and species lists, "I play this character" (`feature/multiclass` in the backend, `feature/character-fixes` in
the frontend); character inventory with coins and typed lines (`feature/inventory` in both).
