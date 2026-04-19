# Redtooth TD Assistant

Chrome extension that adds helpers to the **Redtooth** venue admin **Tournament Director** area (`redtoothpoker.com/venue_admin`).

## Features (overview)

- **Edit Scores** — Week navigation, table spacing, floating “Update” button, player archive & name filter, optional duplicate-rank highlighting or prevention, and related UI tweaks.
- **Other venue admin pages** — Optional tools where enabled (e.g. List Season Score Weeks dates, Add Player helpers).
- **Options** — Toggle features, theme for the options page, and settings that can sync across Chrome profiles when enabled.

Data stays in the browser (`chrome.storage`); the extension does not send your venue data to third-party servers.

## Requirements

- **Node.js** 18+ (for building from source)
- **Google Chrome** or another **Chromium** browser (Edge, Brave, etc.)

## Install from source (developers & testers)

1. Clone this repository:

   ```bash
   git clone https://github.com/hopeypants/redtooth-td-assistant.git
   cd redtooth-td-assistant
   ```

   (Use your fork’s URL instead if you forked the repo.)

2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

   This runs the Vite/`@crxjs` pipeline and writes the loadable extension to **`dist/`**.

3. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the **`dist`** folder inside the project (not the repo root).

4. Open the extension’s options from the toolbar if you want to change defaults (e.g. which features are on).

### Scripts

| Command        | Purpose                          |
|----------------|----------------------------------|
| `npm run build` | Production build → `dist/`       |
| `npm run check` | TypeScript (`tsc --noEmit`)      |
| `npm run dev`   | Vite dev (extension development) |

## Permissions

- **`storage`** — Saves your settings (and optional sync via Chrome).
- **Host access** — Injected only on `https://www.redtoothpoker.com/venue_admin/*` (see `manifest.json`).

## Documentation site

A static install guide is in **`docs/`** and can be published with [GitHub Pages](https://docs.github.com/pages/) (e.g. **Settings → Pages → Branch `main` / folder `/docs`**).

Live URL (after you enable Pages): `https://hopeypants.github.io/redtooth-td-assistant/`

## License

Add a `LICENSE` file in the repo when you choose a license (e.g. MIT).
