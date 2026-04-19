## v1.0.0

First public release. Chrome extension (**Manifest V3**) for Redtooth **venue admin** / Tournament Director pages at `https://www.redtoothpoker.com/venue_admin/*`.

### Highlights

- **Edit Scores** — Season week navigation, adjustable table row spacing, floating **Update** button (position left or right), **player archive** with live name filter (optional Ctrl/Cmd+F focus), **duplicate rank** handling (highlight, prevent, or off) with optional filter for duplicate rows.
- **Lists & dates** — Friendlier dates on **List Season Score Weeks**, optional venue play-day column.
- **Add Player** — Membership number helpers and optional field highlights, default address values when enabled.
- **Options** — Full options page (light / dark / system theme), toggles per feature area, optional **sync** of settings across Chrome profiles.
- **Venue admin UX** — Optional **“Loaded”** badge on venue admin (uses extension icons via `web_accessible_resources`).

### Privacy & data

Settings and optional archive data stay in **`chrome.storage`** in the browser. The extension does not send venue or player data to third-party servers.

### Install

Download **`redtooth-td-assistant-v1.0.0.zip`** from [GitHub Releases](https://github.com/hopeypants/redtooth-td-assistant/releases/latest) (under **Assets**), extract, then in `chrome://extensions` enable **Developer mode** → **Load unpacked** → select the folder that contains `manifest.json`.