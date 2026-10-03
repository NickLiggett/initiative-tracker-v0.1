# Initiative Tracker

A D&D 5e initiative tracker in React. It keeps the turn order for a combat, tracks HP, reactions and legendary
actions, and shows creature stat blocks. Creatures come from [open5e-backend](https://github.com/NickLiggett/open5e-backend),
which serves the Open5e data.

## Running locally

You need [Node.js](https://nodejs.org/) 20 or newer, and open5e-backend running on <http://localhost:8080> (see its
README: `docker compose up -d --build`, then load the data with its importer).

```sh
npm install
npm run dev
```

The app is on <http://localhost:3000>. The dev server passes every request to `/api` on to the backend, so the
browser only talks to one origin and the backend needs no CORS settings.

| Command | What it does |
|---|---|
| `npm run dev` (or `npm start`) | Dev server with hot reload, on port 3000 |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests on every change |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

### Configuration

Copy `.env.example` to `.env.local` (gitignored) to change these:

| Variable | Default | |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:8080` | Where the dev server sends `/api` requests |
| `VITE_API_URL` | empty (same origin) | Call the backend at this URL instead of through `/api`. The backend then needs CORS for this app's origin |
| `VITE_DEV_USER` | unset | Local development only: sent as the `X-User` header, which the backend's `dev` profile uses to pick the user |

## Using it

- **Add combatants** with the form under the grid: name, initiative, and optionally AC and HP. For a creature, choose
  the type **Creature** and search for it; results show their source, since many creatures exist in several (e.g. the
  2014 and 2024 rules).
- **Sort** orders the grid by initiative, highest first. The arrows above the grid move to the next or previous
  turn; the next combatant's reaction is cleared.
- **Edit cells** by double-clicking them. HP takes `+5` to heal and `-7` to deal damage, as well as a new value.
- **Creatures** with legendary actions get checkboxes for their legendary actions per round and Legendary Resistance
  uses. The document icon opens the creature's stat block.

## Project structure

```
src/
├── main.jsx            Entry point
├── App.jsx             The shell: toolbar, navigation drawer, current page
├── api/                The only code that calls the backend
│   ├── client.js       apiGet: URLs, headers, errors (the backend's problem details)
│   └── creatures.js    searchCreatures, getCreature
├── components/layout/  TopToolbar, MainDrawer, UserMenu
├── constants/          The page names
├── features/
│   ├── tracker/        The initiative tracker: TrackerPage, its columns, toolbar, footer, the combatant form,
│   │                   and combatants.js (the turn-order rules, as plain functions)
│   └── creatures/      CreatureSearch, the stat block dialog and its tabs, and creatureFormat.js (reading backend creature data)
├── pages/              Placeholder for pages that don't exist yet
├── utils/              Text helpers
└── test/               Test setup, and a real creature from the backend as a fixture
```

Logic that doesn't need React (turn order, HP edits, formatting creature data) lives in plain `.js` files next to
the components that use it, with tests beside them (`*.test.js`).

The creature data is the backend's creature JSON (`/api/creatures`): camelCase fields such as `hitPoints`,
`armorClass`, `abilityScores`, and `actions` with an `actionType` of `ACTION`, `BONUS_ACTION`, `REACTION` or
`LEGENDARY_ACTION`.

## Future plans

- **The other pages.** The drawer lists Creatures, Players and Settings, which are placeholders so far.
- **Sign-in and saved data.** Sign in through the backend's OpenID Connect provider (authorization code flow), and
  save parties, encounters and homebrew creatures through its write endpoints instead of keeping them only in memory.
- **Legendary checkboxes that remember their state.** They're uncontrolled today, so they reset when the row
  re-renders; the same goes for the Mob checkbox, which doesn't do anything yet.
- **Filling in creature stats.** Prefill AC and HP from the chosen creature.
- **Linting.** Create React App used to provide ESLint; add ESLint (and perhaps Prettier) for Vite.
- **Smaller bundles.** Split MUI and the data grid into their own chunks.
