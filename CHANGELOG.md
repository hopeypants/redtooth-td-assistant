## v1.0.33

Quality-of-life and workflow updates across login automation, Edit Ranks usability, and Add Player reliability.

### Highlights

- **Login page helper** — Added General settings to redirect `https://www.redtoothpoker.com/login` to Venue/TD/Player login pages, with per-page credentials, optional auto-login toggle, and loop safeguards after logout/errors.
- **Edit Ranks improvements** — Added `Rank (xx players)` header count, focused-row highlight while tabbing rank selects, and improved duplicate-rank filtering (including clearing name filter when showing duplicate rows).
- **Missing ranks panel** — Added optional **Highlight missing ranks** toggle in the Ranks tab and a panel that shows missing ranks, optional **Number of players**, and a warning when entered player count is below highest rank entered.
- **Archive/filter UX** — Improved responsive layout, control ordering, spacing consistency, and tab-order behavior for archive/restore and clear-filter controls.
- **Add Player reliability** — Default address values now re-apply right before Save/submit, so blank defaults fill without requiring a page refresh.

### Notes

- User-facing terminology has been shifted toward **Rank/Ranks** in updated UI areas while keeping existing Redtooth route/key compatibility.

## v1.0.0

First public release. Chrome extension (**Manifest V3**) for Redtooth **venue admin** / Tournament Director pages at `https://www.redtoothpoker.com/venue_admin/*`.

### Highlights

- **Edit Scores** — Season week navigation, adjustable table row spacing, floating **Update** button (position left or right), **player archive** with live name filter (optional Ctrl/Cmd+F focus), **duplicate rank** handling (highlight, prevent, or off) with optional filter for duplicate rows.
- **Lists & dates** — Friendlier dates on **List Season Score Weeks**, optional venue game-day column.
- **Add Player** — Membership number helpers and optional field highlights, default address values when enabled.
- **Options** — Full options page (light / dark / system theme), toggles per feature area, optional **sync** of settings across Chrome profiles.
- **Venue admin UX** — Optional **“Loaded”** badge on venue admin (uses extension icons via `web_accessible_resources`).

### Privacy & data

Settings and optional archive data stay in **`chrome.storage`** in the browser. The extension does not send venue or player data to third-party servers.

### Install

Download **`redtooth-td-assistant-v1.0.0.zip`** from [GitHub Releases](https://github.com/hopeypants/redtooth-td-assistant/releases/latest) (under **Assets**), extract, then in `chrome://extensions` enable **Developer mode** → **Load unpacked** → select the folder that contains `manifest.json`.