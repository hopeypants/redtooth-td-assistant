# Redtooth TD Assistant

Chrome extension that adds helpers to the **Redtooth** venue admin **Tournament Director** area (`redtoothpoker.com/venue_admin`).

## Features (overview)

- **Edit Ranks** — Week navigation, table spacing, floating “Update” button, player archive & name filter, duplicate-rank highlighting/prevention, rank header count, optional missing-ranks panel, and related UI tweaks.
- **Login helper** — Optional redirect from Redtooth’s login chooser to Venue / TD / Player login pages, with per-page credentials and optional auto-login.
- **Other venue admin pages** — Optional tools where enabled (e.g. List Season Score Weeks dates, Add Player helpers/default field values).
- **Options** — Toggle features, theme for the options page, and settings that can sync across Chrome profiles when enabled.

Data stays in the browser (`chrome.storage`); the extension does not send your venue data to third-party servers.

## Requirements

- **Google Chrome** or another **Chromium** browser (Edge, Brave, etc.)

## Install (recommended): GitHub Release

Built extensions are published as a **`.zip`** on [GitHub Releases](https://github.com/hopeypants/redtooth-td-assistant/releases/latest). You do **not** need Node.js or Git.

1. Open **[Latest release](https://github.com/hopeypants/redtooth-td-assistant/releases/latest)**.
2. Under **Assets**, download the **`.zip`** (e.g. `redtooth-td-assistant-v1.0.0.zip`).
3. Extract the zip so you have a **folder** whose root contains `manifest.json` (if the zip contains a single inner folder, use that folder).
4. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select that folder.
5. Optional: open the extension’s **Options** from the toolbar to change defaults.

**Updating:** Download a newer release zip, extract it (or replace the old folder), then on `chrome://extensions` click **Reload** on Redtooth TD Assistant.

## What changed since `v1.0.0`

- Added **Login page** settings in General: target page dropdown (Venue / TD / Player), per-page credentials, and auto-login toggle.
- Added safeguards to avoid immediate re-login loops after logout/error.
- Improved Edit Ranks workflow with:
  - duplicate-rank checks after leaving rank controls,
  - focused-row highlighting while tabbing rank selects,
  - rank header count (`Rank (xx players)`),
  - optional **Highlight missing ranks** panel (with player-count warning logic).
- Improved duplicate-row filtering so “Show duplicate rows” clears the active name filter first.
- Improved Add Player reliability: default address fields are re-applied on save/submit (no page refresh needed).
- Multiple responsive/layout/accessibility refinements across archive/filter/navigation controls.

## Build from source (developers)

Requires **Node.js** 18+.

```bash
git clone https://github.com/hopeypants/redtooth-td-assistant.git
cd redtooth-td-assistant
npm install
npm run build
```

Then **Load unpacked** and select the **`dist`** folder. Use your fork’s clone URL if you forked the repo.

### Scripts

| Command         | Purpose                     |
|-----------------|-----------------------------|
| `npm run build` | Production build → `dist/`  |
| `npm run check` | TypeScript (`tsc --noEmit`) |
| `npm run dev`   | Vite dev (extension dev)    |

## Permissions

- **`storage`** — Saves your settings (and optional sync via Chrome).
- **Host access** — Injected on:
  - `https://www.redtoothpoker.com/venue_admin/*`
  - `https://www.redtoothpoker.com/login*`
  - `https://www.redtoothpoker.com/player/login*`
  (see `manifest.json`).

## Documentation site

Static pages in **`docs/`** can be published with [GitHub Pages](https://docs.github.com/pages/) (e.g. **Settings → Pages → Branch `main` / folder `/docs`**).

Live URL: `https://hopeypants.github.io/redtooth-td-assistant/`

## Creating a GitHub release (maintainers)

1. `npm run build`
2. Create a zip of the **`dist`** output. Easiest: zip the **`dist` folder itself** (so after extract, users open the folder that contains `manifest.json`). Alternatively zip **everything inside** `dist/` so the archive root is the extension files.
3. On GitHub: **Releases → Draft a new release**, set the tag (e.g. `v1.0.0`), upload the zip under **Assets**, publish.

## License

[MIT](LICENSE) © hopeypants
