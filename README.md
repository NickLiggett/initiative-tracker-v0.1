# Initiative Tracker

A D&D 5e toolkit in React. It keeps the turn order for a combat (and remembers it between sessions), looks up and
compares creatures and items, lets you make your own and share them with other people, and can be given your own
colors and picture. The game data comes from [open5e-backend](https://github.com/NickLiggett/open5e-backend), which
serves the Open5e content and keeps each user's homebrew, settings and tracker.

## Running locally

You need [Node.js](https://nodejs.org/) 20 or newer, and open5e-backend running on <http://localhost:8080> (see its
README: `docker compose up -d --build`, then load the data with its importer). The backend must include the user data
endpoints (`/api/me/settings`, `/api/me/tracker`, `/api/me/avatar`; its migration `V3`): after updating it, rebuild
with `docker compose up -d --build app`. Without them the app still works, but settings stay in the browser and the
tracker says it isn't being saved.

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
| `VITE_DEV_USER` | unset | Local development only: sent as the `X-User` header, which the backend's `dev` profile uses to pick the user. Anything that saves (homebrew, sharing, settings, the tracker) needs a user, so set this unless you use real sign-in. Ignored when `VITE_OIDC_ISSUER` is set |
| `VITE_OIDC_ISSUER` | unset | Turns on real sign-in: the address of the OpenID Connect realm, e.g. `http://localhost:8180/realms/open5e` |
| `VITE_OIDC_CLIENT_ID` | unset | The client to sign in as, e.g. `initiative-tracker`. Needed together with the issuer |
| `VITE_OIDC_REDIRECT_URI` | the app's own address | Where the provider sends people back to after signing in |

### Signing in

There are two ways to run:

- **Development header (the default).** There is no login page; you are whoever `VITE_DEV_USER` says, and different
  values give different people, which is how to try out sharing. The backend must run in its `dev` profile.
- **Real sign-in.** Set `VITE_OIDC_ISSUER` and `VITE_OIDC_CLIENT_ID` (see `.env.example`) and run the backend with its
  token sign-in, which also starts Keycloak and a mail catcher (in `open5e-backend`):

  ```sh
  docker compose -f compose.yaml -f compose.auth.yaml up -d --build
  ```

  The app then shows a login page first. Test accounts are `dm`, `player` and `stranger` (password = username), and
  anyone can register. The emails for a password reset arrive in the mail catcher at <http://localhost:8025>.
  `docker compose up -d app` puts the backend back in the `dev` profile.

## What it does

The drawer (the menu at the top left) lists the pages.

### Login

With real sign-in on, nobody sees the app until they are signed in. The login page offers:

- **Sign in**, which sends you to the provider's form and brings you back signed in.
- **Create an account**, the provider's registration form; you come back signed in.
- **Forgot your password?**, the provider's reset page, which emails a link to set a new one.

The forms are the provider's (Keycloak's), so passwords never pass through this app. It signs in by the authorization
code flow with PKCE and keeps the tokens for the browser tab: a reload stays signed in, they are renewed in the
background a minute before they end, and if they can't be renewed you are sent back to the login page with a note.
The account menu then has **Manage account** (the provider's page for changing your password or email) and **Sign out**,
which ends the provider's session too.

### Initiative Tracker

- **Add combatants** with the form under the grid: name, initiative, and optionally AC and HP. For a creature, choose
  the type **Creature** and search for it; results show their source, since many creatures exist in several (e.g. the
  2014 and 2024 rules).
- **Sort** orders the grid by initiative, highest first. The arrows above the grid move to the next or previous
  turn; the next combatant's reaction is cleared.
- **Edit cells** by double-clicking them. HP takes `+5` to heal and `-7` to deal damage, as well as a new value.
- **Creatures** with legendary actions get checkboxes for their legendary actions per round and Legendary Resistance
  uses. The document icon opens the creature's stat block.
- **Your tracker is kept on your account.** A moment after any change (adding, editing, sorting, stepping the turn,
  clearing) it is saved to the backend (`/api/me/tracker`), and it is there when you open the tracker again, in any
  browser. The toolbar says whether it is saved, and offers to try again if a save failed. A creature is saved as its
  key and its stat block is looked up again on load; one that can't be found is mentioned, and the combatant is kept. If
  the saved tracker can't be loaded, nothing is saved over it. (The legendary action checkboxes are not part of what is
  saved yet.)

### Creatures

- **Search** by name. A creature shows as a full stat block: armor class, hit points, speeds, initiative, challenge and
  experience, ability scores with their saving throws, skills, senses, languages, damage and condition lists, traits, and
  actions grouped as actions, bonus actions, reactions and legendary actions.
- **Compare** two creatures: a table lines up their numbers (with the difference and which is bigger), saves, skills,
  senses and defenses, then their traits and actions, with the ones both have marked as shared.
- **New creature** and **Duplicate** (copy the one shown and change it; it remembers what it came from) open an
  editor: a form beside a live preview of the stat block. The form covers the basics, combat numbers, ability scores,
  saving throws and skills (proficiency or expertise, with each resulting bonus shown), senses, damage and condition
  lists, and traits and actions (with usage limits such as "Recharge 5-6" and legendary costs). Modifiers, saves,
  passive Perception, speeds and experience are worked out for you, because the backend stores them rather than
  working them out.
- **Edit** and **Delete** appear on creatures in a document you own, or that someone shared with you as an editor.

### Items

- **Search** items and magic items together, filtered by kind, category and rarity. An item shows its cost (in gp, sp
  or cp), weight, rarity and attunement, weapon damage, properties and mastery (hover one for its rule), armor class
  and requirements, and its description, which can include tables.
- **Compare** two items the same way as creatures: kind, category, rarity, attunement, cost, weight, weapon and armor
  details, then the descriptions side by side (or one note when they are the same, as the 2014 and 2024 versions often are).
- **New item**, **Duplicate**, **Edit** and **Delete** work as for creatures. The item editor adds cost in gp, sp or
  cp, a rarity and attunement for magic items, and weapon and armor blocks (damage, class, properties picked from the
  backend's list with their own details; armor class, Dexterity limit, Strength, stealth).

### Sharing

Share your homebrew with other people by username. Each document you own lists who it is shared with, with their
pictures; add someone as a **viewer** (can see it) or an **editor** (can also change and delete what is in it),
change their role, or stop sharing. It also lists the homebrew other people have shared with you, which you can leave.
The person needs to have signed in once, because the backend only knows usernames it has seen.

### Settings

Open it from the account menu (your picture at the top right) or the drawer.

- **Profile:** upload a picture for your avatar. It is cropped to a square from the middle and shrunk to 256 pixels in
  the browser, then sent to the backend (`/api/me/avatar`). People you share with see it next to your name.
- **Appearance:** light, dark or match your device; six color themes, or any main and second color by chooser or hex
  code, with a warning when a color would be hard to see against the page. Changes apply as you make them.
- Both are saved to your account (`/api/me/settings`), so they follow you to other browsers. A copy in the browser
  shows the right colors before the backend has answered, and keeps changes that couldn't be sent. Settings an earlier
  version kept only in the browser move to the account the first time they are found there.

## Project structure

```
src/
├── main.jsx            Entry point
├── App.jsx             The shell: toolbar, navigation drawer, current page
├── api/                The only code that calls the backend
│   ├── client.js       apiGet, apiSend (JSON, or a picture as it is): URLs, headers, errors (the backend's problem details)
│   ├── resource.js     createResourceApi: search, get, create, replace, copy and remove for any collection
│   ├── creatures.js    The creatures collection
│   ├── items.js        Items and magic items, searchItems across both, and apiFor (the collection an item is in)
│   ├── documents.js    The signed-in user, documents, and who they are shared with (share, change role, stop sharing)
│   ├── sharing.js      Everything the Sharing page shows, loaded together
│   ├── ownership.js    Which documents the signed-in user can change (their own, and those they are an editor of)
│   ├── profile.js      The signed-in user's own settings, avatar picture and tracker state, and where anyone's avatar is
│   └── reference.js    The sizes, types, damage types, conditions, item categories, rarities and weapon properties the editors offer
├── components/
│   ├── layout/         TopToolbar, MainDrawer, UserMenu, UserAvatar
│   ├── resource/       What every kind of content (creatures, items, ...) shares: ResourcePage (search, compare, new,
│   │                   duplicate, edit, delete), ResourceSearch, ComparisonTable (and compareRows.js, its row builders),
│   │                   EditorShell, FormSection, StatBlockParts, ConfirmDialog
│   └── Description.jsx Trait, action and item text (bold, italic, lists, tables)
├── auth/               Signing in: the provider (AuthContext), the gate that shows the login page, and plain-function helpers:
│                       pkce.js, tokens.js (kept for the tab), oidc.js (addresses and token requests)
├── constants/          The page names
├── features/
│   ├── login/          LoginPage
│   ├── tracker/        The initiative tracker: TrackerPage, its columns, toolbar, footer and combatant form,
│   │                   combatants.js (the turn-order rules, as plain functions), and useSavedTracker with
│   │                   trackerState.js (keeping it on the account and bringing it back)
│   ├── creatures/      What is particular to creatures: the stat block (also used by the dialog), the editor and its
│   │                   form, and plain-function helpers: creatureFormat.js (reading backend creature data),
│   │                   compareCreatures.js, creatureDraft.js (editor form state to backend JSON)
│   ├── items/          ItemsPage, filters, stat block, comparison, editor and its form, and the same kind of helpers:
│   │                   itemFormat.js, compareItems.js, itemDraft.js
│   ├── sharing/        SharingPage and its document cards, and sharing.js (the username and role rules)
│   └── settings/       SettingsPage, with the profile (avatar) and appearance (mode and colors) tabs
├── settings/           The user's look-and-feel settings: what they are and the copy kept in the browser (settings.js),
│                       the theme they make (theme.js), the provider that applies them and keeps them on the account
│                       (SettingsContext.jsx), and colors.js and avatar.js (hex colors, contrast, shrinking a picture)
├── pages/              Placeholder for pages that don't exist yet (Players)
├── utils/              Text helpers
└── test/               Test setup, a fake backend (fakeApi.js) and real creatures and items from the backend as fixtures
```

Logic that doesn't need React (turn order, HP edits, formatting and comparing data, turning a form into the backend's
JSON) lives in plain `.js` files next to the components that use it, with tests beside them (`*.test.js`).

## Tests

```sh
npm test
```

The tests run without a backend: `src/test/fakeApi.js` stands in for it, answering the routes a test gives it, and
the fixtures in `src/test/fixtures/` are real records from the backend. The editors' draft logic is also checked
against the whole of the real data (every creature and item saves back unchanged), and the storage features have
been run in a real browser against a real backend; those checks aren't part of the suite because they need one.

## About the data

The creature data is the backend's creature JSON (`/api/creatures`): camelCase fields such as `hitPoints`,
`armorClass`, `abilityScores`, and `actions` with an `actionType` of `ACTION`, `BONUS_ACTION`, `REACTION` or
`LEGENDARY_ACTION`. Items (`/api/items`) and magic items (`/api/magicitems`) have the same shape, magic items adding a
rarity and attunement. Everything a user makes is saved in their own homebrew document (or, when a creature or item is
copied, the copy is), which is what sharing shares.

The backend stores derived numbers (modifiers, saves, passive Perception, `speedAll`, an armor class text like
"14 + Dex modifier (max 2)") instead of working them out, so the editors calculate them.

## Future plans

- **Email invitations** to shared homebrew, for people who haven't signed in yet. Sign-in now exists; this needs an
  email service and a way to hold an invitation until the person has an account.
- **Make Keycloak's pages look like the app.** They are Keycloak's own theme, so signing in leaves the app's look
  behind for a moment.
- **Fewer clicks to get back in.** A new tab asks you to press Sign in (which the provider answers at once while its
  session lasts); a silent check could skip that.
- **Production sign-in settings** in the backend's realm: email verification, a real mail server, a password policy,
  and the app's real address instead of `http://localhost:*`.
- **The Players page.** It is a placeholder.
- **Separate documents** (say, one per campaign), so a DM can share one and keep another private. The backend allows
  it; the editors would need a "save into which document" choice.
- **Legendary checkboxes that remember their state.** They're uncontrolled today, so they reset when the row
  re-renders and aren't saved with the tracker; the same goes for the Mob checkbox, which doesn't do anything yet.
- **Filling in creature stats.** Prefill AC and HP from the chosen creature.
- **Dark mode text.** Text-style buttons in a dark main color (Forest, Royal) are dim on the dark page; lighten them there.
- **Showing what changed** between two descriptions, word by word, when comparing (the 2014 and 2024 versions).
- **A markdown library** for descriptions in place of the small renderer in `Description.jsx` (blocked while the npm
  registry token is out of date).
- **Linting.** Create React App used to provide ESLint; add ESLint (and perhaps Prettier) for Vite.
- **Smaller bundles.** Split MUI and the data grid into their own chunks.
