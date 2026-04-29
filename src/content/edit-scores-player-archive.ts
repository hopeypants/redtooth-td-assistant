import {
  isSyncToggleChange,
  settingsGet,
  settingsSet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'
import { syncEditScoresRankHeaderCount } from './edit-scores-rank-header-count'
import { EDIT_SCORES_PATH_RE } from './floating-update-button'

/** Venue Players (`venue_admin/listplayers/`) — same player IDs as Edit Scores (`editplayerdetails/&lt;id&gt;`). */
const LIST_PLAYERS_PATH_RE = /^\/venue_admin\/listplayers\/?/i
const EDIT_PLAYER_DETAILS_HREF_RE = /\/venue_admin\/editplayerdetails\/(\d+)/i

const BAR_ID = 'redtooth-td-assistant-player-archive-bar'
const STYLE_ID = 'redtooth-td-assistant-player-archive-style-v4'
/** Inner flex wrapper — avoid `display:flex` on `<td>` (breaks table border-collapse). */
const CELL_INNER_CLASS = 'rta-player-inner'
const NAME_CLASS = 'rta-player-archive-name'
const BTN_ARCHIVE = 'rta-player-archive-btn'
const BTN_RESTORE = 'rta-player-restore-btn'
const ROW_ARCHIVED = 'rta-row-archived'

const STORAGE_KEYS_ARCHIVE = [
  STORAGE_KEYS.assistantEnabled,
  STORAGE_KEYS.editScoresPlayerArchiveEnabled,
  STORAGE_KEYS.editScoresPlayerNameFilterEnabled,
  STORAGE_KEYS.editScoresPlayerNameFilterIncludeArchived,
  STORAGE_KEYS.editScoresPlayerNameFilterCtrlFToFocus,
  STORAGE_KEYS.editScoresPlayerNameFilterEscClears,
  STORAGE_KEYS.editScoresHighlightMissingRanks,
  STORAGE_KEYS.editScoresArchivedPlayerIds,
] as const

let listenerAttached = false
/** How archived rows interact with the table: hidden by default, all visible, or only archived visible. */
let archiveViewMode: 'hideArchived' | 'showAll' | 'onlyArchived' = 'hideArchived'
/** Inline “clear all archived” confirmation panel is visible (below the bar buttons). */
let clearArchivePanelOpen = false
let editScoresRankListenerAttached = false

const CLEAR_PANEL_CLASS = 'rta-clear-archive-panel'
/** Bar row: “Clear all archived” — same red treatment as the confirmation button. */
const CLEAR_ARCHIVE_BAR_BTN_CLASS = 'rta-clear-archive-bar-btn'
const NAME_FILTER_INPUT_ID = 'rta-edit-scores-name-filter'
const MISSING_RANKS_PANEL_ID = 'rta-edit-scores-missing-ranks-panel'

/** Live name filter on Edit Scores (substring match, case-insensitive). */
let editScoresNameFilter = ''
/** Mirrors options: `editScoresPlayerNameFilterEnabled`. */
let editScoresNameFilterFeatureEnabled: boolean =
  STORAGE_DEFAULTS.editScoresPlayerNameFilterEnabled
/** While filtering, bypass archive hiding so matching archived rows stay visible. */
let nameFilterIncludeArchivedWhenFiltering: boolean =
  STORAGE_DEFAULTS.editScoresPlayerNameFilterIncludeArchived
/** Last table + archive set for live filter reapply (Edit Scores or Venue Players). */
let lastNameFilterContext: {
  table: HTMLTableElement
  archived: Set<number>
} | null = null
/** Column index of membership # in `td` cells, or null if not detected. */
let membershipColumnIndexForFilter: number | null = null
/** Focus the name filter once per page visit (not on every storage re-apply). */
let nameFilterAutoFocusDone = false
/** Mirrors options: `editScoresPlayerArchiveEnabled` — archive UI and row hiding. */
let playerArchiveFeatureEnabled: boolean =
  STORAGE_DEFAULTS.editScoresPlayerArchiveEnabled
/** Ctrl/Cmd+F focuses the name filter instead of the browser find bar. */
let nameFilterCtrlFToFocus: boolean =
  STORAGE_DEFAULTS.editScoresPlayerNameFilterCtrlFToFocus
/** Escape clears the filter when the filter input is focused. */
let nameFilterEscClears: boolean =
  STORAGE_DEFAULTS.editScoresPlayerNameFilterEscClears

let nameFilterWindowKeydownAttached = false
/** Optional max rank (usually player count) used for missing-rank calculation on Edit Scores. */
let missingRanksExpectedMaxText = ''
let highlightMissingRanksEnabled: boolean =
  STORAGE_DEFAULTS.editScoresHighlightMissingRanks

function nameFilterWindowKeydownHandler(ev: KeyboardEvent): void {
  if (!nameFilterCtrlFToFocus || !editScoresNameFilterFeatureEnabled) return
  const path = window.location.pathname
  if (!EDIT_SCORES_PATH_RE.test(path) && !LIST_PLAYERS_PATH_RE.test(path)) {
    return
  }
  const isFindShortcut =
    (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'f'
  if (!isFindShortcut) return
  const input = document.getElementById(NAME_FILTER_INPUT_ID)
  if (!input || !(input instanceof HTMLInputElement)) return
  ev.preventDefault()
  ev.stopPropagation()
  input.focus()
  requestAnimationFrame(() => {
    input.select()
  })
}

function ensureNameFilterWindowKeydownListener(): void {
  if (nameFilterWindowKeydownAttached) return
  window.addEventListener('keydown', nameFilterWindowKeydownHandler, true)
  nameFilterWindowKeydownAttached = true
}

function removeNameFilterWindowKeydownListener(): void {
  if (!nameFilterWindowKeydownAttached) return
  window.removeEventListener('keydown', nameFilterWindowKeydownHandler, true)
  nameFilterWindowKeydownAttached = false
}

/** `player_ranks` value `0` = Did Not Play; any other value means a rank for this week. */
function hasEditScoresWeekRank(sel: HTMLSelectElement): boolean {
  const v = Number.parseInt(sel.value, 10)
  return Number.isFinite(v) && v > 0
}

function normalizeArchivedIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  for (const x of raw) {
    const n =
      typeof x === 'number'
        ? x
        : typeof x === 'string'
          ? Number.parseInt(x, 10)
          : Number.NaN
    if (Number.isFinite(n) && n > 0) out.push(Math.trunc(n))
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

function parsePlayerIdFromSelect(sel: HTMLSelectElement): number | null {
  const m = /^player_(\d+)$/.exec(sel.name)
  if (!m) return null
  const id = Number.parseInt(m[1], 10)
  return Number.isFinite(id) ? id : null
}

function parsePlayerIdFromListRow(tr: HTMLTableRowElement): number | null {
  const a = tr.querySelector<HTMLAnchorElement>(
    'a[href*="/venue_admin/editplayerdetails/"]',
  )
  const href = a?.getAttribute('href') ?? a?.href
  if (!href) return null
  const m = EDIT_PLAYER_DETAILS_HREF_RE.exec(href)
  if (!m) return null
  const id = Number.parseInt(m[1], 10)
  return Number.isFinite(id) ? id : null
}

function isPlayerArchivePage(): boolean {
  return (
    EDIT_SCORES_PATH_RE.test(window.location.pathname) ||
    LIST_PLAYERS_PATH_RE.test(window.location.pathname)
  )
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = [
    `#${BAR_ID}{margin:0 0 14px 0;padding:10px 12px;background:#f0f4fa;border:1px solid #c5d0e0;border-radius:6px;font:13px/1.45 system-ui,sans-serif;color:#1a1a1a;container-type:inline-size;container-name:rta-archivebar;}`,
    `#${BAR_ID} .rta-bar-row{display:flex;flex-wrap:wrap;flex-direction:row;align-items:center;gap:8px 14px;row-gap:10px;width:100%;justify-content:space-between;}`,
    `#${BAR_ID} .rta-bar-left{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;flex:1;min-width:0;order:1;}`,
    `#${BAR_ID} .rta-bar-filter-wrap{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;gap:8px;margin-left:auto;flex-shrink:0;max-width:100%;min-width:0;order:2;}`,
    `#${BAR_ID} .rta-bar-filter-label{font-size:12px;color:#555;white-space:nowrap;flex-shrink:0;}`,
    `#${BAR_ID} .rta-name-filter-field{position:relative;display:block;flex:1 1 auto;min-width:0;max-width:100%;}`,
    `#${BAR_ID} .rta-name-filter{font:inherit;font-size:13px;padding:5px 26px 5px 8px;border:1px solid #c5d0e0;border-radius:4px;min-width:11rem;max-width:18rem;width:14rem;background:#fff;color:#1a1a1a;box-sizing:border-box;}`,
    `@container rta-archivebar (max-width:36rem){`,
    `#${BAR_ID} .rta-bar-row{flex-direction:column;align-items:stretch;justify-content:flex-start;gap:10px;}`,
    `#${BAR_ID} .rta-bar-left{width:100%;flex:0 0 auto;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS}{order:2;margin-top:0;flex:0 0 auto;width:100%;}`,
    `#${BAR_ID} .rta-bar-filter-wrap{order:3;width:100%;margin-left:0;flex-direction:row;align-items:center;gap:8px;min-width:0;}`,
    `#${BAR_ID} .rta-name-filter-field{flex:1 1 auto;min-width:0;max-width:100%;}`,
    `#${BAR_ID} .rta-name-filter{width:100% !important;max-width:none;min-width:0;}`,
    `}`,
    `@media (max-width:790px){`,
    `#${BAR_ID} .rta-bar-left{flex:1 1 100%;width:100%;max-width:100%;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS}{order:2;margin-top:0;flex:0 0 auto;width:100%;}`,
    `#${BAR_ID} .rta-bar-filter-wrap{order:3;flex:1 1 100%;width:100%;max-width:100%;margin-left:0;}`,
    `#${BAR_ID} .rta-name-filter-field{flex:1 1 auto;min-width:0;max-width:100%;}`,
    `#${BAR_ID} .rta-name-filter{width:100% !important;max-width:none;min-width:0;}`,
    `}`,
    `#${BAR_ID} .rta-name-filter:focus{outline:2px solid #2b6cb0;outline-offset:1px;}`,
    `#${BAR_ID} .rta-name-filter-clear{position:absolute;right:1px;top:50%;transform:translateY(-50%);border:none;background:transparent;color:#a0aec0;padding:2px 8px;cursor:pointer;font-size:18px;line-height:1;font-weight:400;}`,
    `#${BAR_ID} .rta-name-filter-clear:hover{background-color:#ebebeb;}`,
    `#${BAR_ID} .rta-name-filter-clear[hidden]{display:none !important;}`,
    `#${BAR_ID} button{font:inherit;padding:5px 10px;min-height:32px;box-sizing:border-box;border-radius:4px;border:1px solid #2c5282;background:#2b6cb0;color:#fff;cursor:pointer;}`,
    `#${BAR_ID} button:hover{background:#2c5282;}`,
    `#${BAR_ID} button[aria-pressed="true"]{background:#2c5282;border-color:#1a365d;}`,
    `#${BAR_ID} button.${CLEAR_ARCHIVE_BAR_BTN_CLASS}{background:#c53030;border-color:#9b2c2c;color:#fff;}`,
    `#${BAR_ID} button.${CLEAR_ARCHIVE_BAR_BTN_CLASS}:hover{background:#9b2c2c;}`,
    `#${BAR_ID} .rta-bar-muted{color:#555;font-size:12px;}`,
    `#${MISSING_RANKS_PANEL_ID}{margin:0 0 14px 0;padding:10px 12px;background:#f7fafc;border:1px solid #d6dee8;border-radius:6px;font:13px/1.45 system-ui,sans-serif;color:#1a1a1a;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-row{display:flex;flex-wrap:nowrap;align-items:center;justify-content:flex-start;gap:8px 12px;min-width:0;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-label{font-weight:600;white-space:nowrap;flex:0 0 auto;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-expected{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:0 0 auto;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-expected span{white-space:nowrap;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-expected input{width:6rem;font:inherit;padding:4px 8px;border:1px solid #c5d0e0;border-radius:4px;background:#fff;color:#1a1a1a;box-sizing:border-box;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-body{color:#334155;word-break:break-word;overflow-wrap:anywhere;flex:1 1 auto;min-width:0;}`,
    `#${MISSING_RANKS_PANEL_ID} .rta-missing-ranks-warning{margin-top:8px;color:#9b2c2c;font-weight:600;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS}{order:3;margin-top:0;padding:10px 12px;background:#fffef9;border:1px solid #c53030;border-radius:6px;flex:1 1 100%;width:100%;min-width:0;box-sizing:border-box;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} p{margin:0 0 10px;font-size:12px;line-height:1.45;color:#1a1a1a;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} label.rta-clear-ack{display:flex;align-items:center;gap:8px;font-size:12px;line-height:1.35;cursor:pointer;margin:0 0 12px;color:#1a1a1a;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} label.rta-clear-ack input{margin:0;flex-shrink:0;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} .rta-clear-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} .rta-clear-confirm-btn{background:#c53030;border-color:#9b2c2c;color:#fff;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} .rta-clear-confirm-btn:hover:not(:disabled){background:#9b2c2c;}`,
    `#${BAR_ID} .${CLEAR_PANEL_CLASS} button:disabled{opacity:0.5;cursor:not-allowed;}`,
    `tr.${ROW_ARCHIVED} td{background:rgba(255,193,7,0.12);}`,
    `.${CELL_INNER_CLASS}{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;width:100%;min-width:0;box-sizing:border-box;border:none;outline:none;background:transparent;}`,
    `.${BTN_ARCHIVE},.${BTN_RESTORE}{flex-shrink:0;font:inherit;font-size:11px;padding:2px 8px;margin:0 10px 0;min-width:4rem;border-radius:4px;cursor:pointer;text-align:center;box-sizing:border-box;}`,
    `.${NAME_CLASS}{flex:1;min-width:0;}`,
    `.${BTN_ARCHIVE}{border:1px solid #718096;background:#edf2f7;color:#2d3748;}`,
    `.${BTN_RESTORE}{border:1px solid #2f855a;background:#c6f6d5;color:#22543d;}`,
  ].join('')
  document.head.appendChild(s)
}

function parsePositiveIntOrNull(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

function readScoringRanks(table: HTMLTableElement): number[] {
  const out: number[] = []
  for (const sel of table.querySelectorAll<HTMLSelectElement>(
    'select.player_ranks[name^="player_"]',
  )) {
    const n = Number.parseInt(sel.value, 10)
    if (Number.isFinite(n) && n > 0) out.push(Math.trunc(n))
  }
  return out
}

function computeMissingRanksSummary(
  table: HTMLTableElement,
  expectedMax: number | null,
): { missing: number[]; maxRank: number; rankedPlayers: number; highest: number } {
  const ranks = readScoringRanks(table)
  const rankedPlayers = ranks.length
  const highest = ranks.length > 0 ? Math.max(...ranks) : 0
  const maxRank = expectedMax === null ? highest : Math.max(highest, expectedMax)
  if (maxRank <= 0) return { missing: [], maxRank: 0, rankedPlayers, highest }
  const present = new Set(ranks)
  const missing: number[] = []
  for (let i = 1; i <= maxRank; i++) {
    if (!present.has(i)) missing.push(i)
  }
  return { missing, maxRank, rankedPlayers, highest }
}

function ensureMissingRanksPanel(bar: HTMLElement): HTMLElement {
  let el = document.getElementById(MISSING_RANKS_PANEL_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = MISSING_RANKS_PANEL_ID
  }
  bar.insertAdjacentElement('beforebegin', el)
  return el
}

function renderMissingRanksPanel(
  bar: HTMLElement,
  table: HTMLTableElement,
): void {
  const panel = ensureMissingRanksPanel(bar)
  const parsedExpected = parsePositiveIntOrNull(missingRanksExpectedMaxText)
  const summary = computeMissingRanksSummary(table, parsedExpected)
  const missingText =
    summary.maxRank <= 0
      ? 'No ranks entered yet.'
      : summary.missing.length === 0
        ? 'No missing ranks.'
        : summary.missing.join(', ')
  panel.innerHTML = ''
  const row = document.createElement('div')
  row.className = 'rta-missing-ranks-row'
  const title = document.createElement('span')
  title.className = 'rta-missing-ranks-label'
  title.textContent = 'Missing ranks'
  const expectedWrap = document.createElement('label')
  expectedWrap.className = 'rta-missing-ranks-expected'
  const expectedText = document.createElement('span')
  expectedText.textContent = 'Number of players'
  const expectedInput = document.createElement('input')
  expectedInput.type = 'number'
  expectedInput.min = '1'
  expectedInput.step = '1'
  expectedInput.placeholder = 'optional'
  expectedInput.value = missingRanksExpectedMaxText
  expectedInput.addEventListener('change', () => {
    missingRanksExpectedMaxText = expectedInput.value
    renderMissingRanksPanel(bar, table)
  })
  expectedWrap.append(expectedText, expectedInput)
  const body = document.createElement('div')
  body.className = 'rta-missing-ranks-body'
  const rangeSuffix = summary.maxRank > 0 ? ` (1-${summary.maxRank})` : ''
  body.textContent = `Ranks${rangeSuffix}: ${missingText}`
  row.append(title, expectedWrap, body)
  panel.append(row)
  if (parsedExpected !== null && parsedExpected < summary.highest) {
    const warning = document.createElement('div')
    warning.className = 'rta-missing-ranks-warning'
    warning.textContent =
      `Warning: Number of players (${parsedExpected}) is less than highest rank entered (${summary.highest}).`
    panel.append(warning)
  }
}

function findScoresTable(): HTMLTableElement | null {
  const sel = document.querySelector<HTMLSelectElement>('select.player_ranks[name^="player_"]')
  if (!sel) return null
  return sel.closest('table')
}

function findListPlayersTable(): HTMLTableElement | null {
  const a = document.querySelector<HTMLAnchorElement>(
    'table.styledTbl a[href*="/venue_admin/editplayerdetails/"]',
  )
  return a?.closest('table') ?? null
}

function playerThHeaderLabelForMatch(th: HTMLTableCellElement): string {
  let t = (th.textContent ?? '').replace(/\s+/g, ' ').trim()
  const stripped = /^(.*?)\s*\([^)]*\)\s*$/i.exec(t)
  if (stripped) t = stripped[1].trim()
  return t
}

function findPlayerColumnHeaderCell(
  table: HTMLTableElement,
): HTMLTableCellElement | null {
  const headerRow = table.querySelector('thead tr') ?? table.rows[0]
  if (!headerRow) return null
  for (const th of headerRow.querySelectorAll<HTMLTableCellElement>('th')) {
    const t = playerThHeaderLabelForMatch(th)
    if (/^player\b/i.test(t)) return th
  }
  return null
}

function removePlayerThArchivedNote(th: HTMLTableCellElement): void {
  const base = th.dataset.rtaPlayerThBase
  if (base) {
    th.textContent = base
    delete th.dataset.rtaPlayerThBase
  }
}

function archivedCountParenPhrase(n: number): string {
  if (n === 0) return '0 players archived'
  if (n === 1) return '1 player archived'
  return `${n} players archived`
}

function syncPlayerThArchivedNote(
  table: HTMLTableElement | null,
  n: number,
  archiveFeatureEnabled: boolean,
): void {
  if (!table) return
  const th = findPlayerColumnHeaderCell(table)
  if (!th) return
  if (!archiveFeatureEnabled) {
    removePlayerThArchivedNote(th)
    return
  }
  let base = th.dataset.rtaPlayerThBase
  if (!base) {
    base = playerThHeaderLabelForMatch(th) || 'Players'
    th.dataset.rtaPlayerThBase = base
  }
  th.textContent = `${base} (${archivedCountParenPhrase(n)})`
}

function clearAllPlayerThArchiveLabels(): void {
  for (const th of document.querySelectorAll<HTMLTableCellElement>(
    'th[data-rta-player-th-base]',
  )) {
    removePlayerThArchivedNote(th)
  }
}

function playerNameTextForFilter(nameCell: HTMLTableCellElement): string {
  const span = nameCell.querySelector(`.${NAME_CLASS}`)
  return (span?.textContent ?? nameCell.textContent ?? '').trim()
}

/** Header cell text suggests a membership / player number column (Venue Players table only). */
const MEMBERSHIP_HEADER_RE =
  /\bmembership\b|\bmem\.?\s*no\.?\b|\bmember\s*#?\b|\bplayer\s*#?\b/i

/** Used only on the Venue Players page; Edit Scores does not filter by membership. */
function detectMembershipColumnIndex(
  table: HTMLTableElement,
  path: string,
): number | null {
  const scanRow = (row: HTMLTableRowElement | null): number | null => {
    if (!row) return null
    const cells = row.querySelectorAll<HTMLTableCellElement>('th, td')
    for (let i = 0; i < cells.length; i++) {
      const t = (cells[i].textContent ?? '').replace(/\s+/g, ' ').trim()
      if (MEMBERSHIP_HEADER_RE.test(t)) return i
    }
    return null
  }

  let idx = scanRow(table.querySelector('thead tr'))
  if (idx !== null) return idx
  idx = scanRow(table.tBodies[0]?.rows[0] ?? null)
  if (idx !== null) return idx
  const top = table.rows[0]
  if (top?.querySelector('th')) idx = scanRow(top)
  if (idx !== null) return idx

  if (LIST_PLAYERS_PATH_RE.test(path)) {
    const sample = table
      .querySelector<HTMLAnchorElement>(
        'tbody a[href*="/venue_admin/editplayerdetails/"]',
      )
      ?.closest('tr')
    if (sample) {
      const cells = sample.querySelectorAll('td')
      if (cells.length >= 2) return 0
    }
  }
  return null
}

function rowFilterSearchText(
  tr: HTMLTableRowElement,
  nameCell: HTMLTableCellElement,
): string {
  const namePart = playerNameTextForFilter(nameCell)
  if (!LIST_PLAYERS_PATH_RE.test(window.location.pathname)) {
    return namePart
  }
  const parts: string[] = [namePart]
  const idx = membershipColumnIndexForFilter
  if (idx !== null) {
    const cells = tr.querySelectorAll('td')
    const mc = cells[idx] as HTMLTableCellElement | undefined
    if (mc && mc !== nameCell) {
      const raw = (mc.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (raw) parts.push(raw)
    }
  }
  return parts.join(' ')
}

function reapplyNameFilterOnly(): void {
  const ctx = lastNameFilterContext
  if (!ctx || !editScoresNameFilterFeatureEnabled) return
  const archivedForRows = playerArchiveFeatureEnabled
    ? ctx.archived
    : new Set<number>()
  const path = window.location.pathname
  const body = ctx.table.tBodies[0] ?? ctx.table
  if (EDIT_SCORES_PATH_RE.test(path)) {
    for (const tr of body.querySelectorAll<HTMLTableRowElement>(
      'tr[data-rta-archive-init]',
    )) {
      const select = tr.querySelector<HTMLSelectElement>(
        'select.player_ranks[name^="player_"]',
      )
      if (!select) continue
      const playerId = parsePlayerIdFromSelect(select)
      const cells = tr.querySelectorAll('td')
      const nameCell = cells[0] ?? null
      if (playerId === null || !nameCell) continue
      applyRowState(tr, playerId, nameCell, archivedForRows, select)
    }
  } else if (LIST_PLAYERS_PATH_RE.test(path)) {
    for (const tr of body.querySelectorAll<HTMLTableRowElement>(
      'tr[data-rta-archive-init]',
    )) {
      const playerId = parsePlayerIdFromListRow(tr)
      const cells = tr.querySelectorAll('td')
      const nameCell = (cells[1] as HTMLTableCellElement | undefined) ?? null
      if (playerId === null || !nameCell) continue
      applyRowState(tr, playerId, nameCell, archivedForRows, null)
    }
  }
}

function saveArchivedIds(ids: number[]): void {
  if (!isExtensionContextValid()) return
  try {
    settingsSet({
      [STORAGE_KEYS.editScoresArchivedPlayerIds]: ids,
    })
  } catch {
    /* Extension context invalidated */
  }
}

function applyRowState(
  tr: HTMLTableRowElement,
  playerId: number,
  nameCell: HTMLTableCellElement,
  archived: Set<number>,
  rankSelect: HTMLSelectElement | null,
): void {
  const isArchived = archived.has(playerId)
  tr.dataset.rtaArchived = isArchived ? '1' : '0'

  const scoredThisWeek =
    rankSelect !== null && hasEditScoresWeekRank(rankSelect)

  const path = window.location.pathname
  const onEditScores = EDIT_SCORES_PATH_RE.test(path)
  const onListPlayers = LIST_PLAYERS_PATH_RE.test(path)
  const q =
    editScoresNameFilterFeatureEnabled && (onEditScores || onListPlayers)
      ? editScoresNameFilter.trim().toLowerCase()
      : ''
  const filterActive = q !== ''

  const bypassArchiveForFilter =
    filterActive && nameFilterIncludeArchivedWhenFiltering

  const hideRowArchive =
    !playerArchiveFeatureEnabled
      ? false
      : bypassArchiveForFilter
        ? false
        : (() => {
            if (archiveViewMode === 'onlyArchived') return !isArchived
            if (archiveViewMode === 'showAll') return false
            return isArchived && !scoredThisWeek
          })()

  const hideRowNameFilter =
    filterActive &&
    !rowFilterSearchText(tr, nameCell).toLowerCase().includes(q)

  const hideRow = hideRowArchive || hideRowNameFilter

  if (hideRow) {
    tr.style.display = 'none'
  } else {
    tr.style.display = ''
    if (isArchived) tr.classList.add(ROW_ARCHIVED)
    else tr.classList.remove(ROW_ARCHIVED)
  }

  const inner = nameCell.querySelector<HTMLElement>(`.${CELL_INNER_CLASS}`)
  const existingBtn = inner?.querySelector(`.${BTN_ARCHIVE}, .${BTN_RESTORE}`)
  existingBtn?.remove()

  if (playerArchiveFeatureEnabled) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.tabIndex = -1
    if (isArchived) {
      btn.className = BTN_RESTORE
      btn.textContent = 'Restore'
      btn.title =
        'Remove from archive (Edit Scores: rows with a rank for this week may stay visible while archived)'
      btn.addEventListener('click', () => {
        const next = normalizeArchivedIds(
          [...archived].filter((id) => id !== playerId),
        )
        saveArchivedIds(next)
      })
    } else {
      btn.className = BTN_ARCHIVE
      btn.textContent = 'Archive'
      btn.title =
        'Hide this player on Edit Scores and Venue Players in your browser (does not remove them from Redtooth)'
      btn.addEventListener('click', () => {
        const next = normalizeArchivedIds([...archived, playerId])
        saveArchivedIds(next)
      })
    }
    if (inner) {
      inner.prepend(btn)
    }
  }
}

function appendClearArchiveConfirmPanel(parent: HTMLElement): void {
  const panel = document.createElement('div')
  panel.className = CLEAR_PANEL_CLASS
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-label', 'Confirm clear archive')

  const p = document.createElement('p')
  p.textContent =
    'This makes all archived players active again in your browser so they show in the table as usual. No one is deleted. Nothing changes on the Redtooth website.'

  const label = document.createElement('label')
  label.className = 'rta-clear-ack'
  const cb = document.createElement('input')
  cb.type = 'checkbox'
  cb.id = 'rta-clear-archive-ack'
  const span = document.createElement('span')
  span.textContent =
    'I understand this only affects what I see in my browser, not the Redtooth website.'
  label.appendChild(cb)
  label.appendChild(span)

  const actions = document.createElement('div')
  actions.className = 'rta-clear-actions'

  const confirmBtn = document.createElement('button')
  confirmBtn.type = 'button'
  confirmBtn.className = 'rta-clear-confirm-btn'
  confirmBtn.textContent = 'Clear archive list'
  confirmBtn.disabled = true
  confirmBtn.title = 'Enable by checking the box above'

  cb.addEventListener('change', () => {
    confirmBtn.disabled = !cb.checked
    confirmBtn.title = cb.checked
      ? 'Make all players active again in this browser'
      : 'Enable by checking the box above'
  })

  confirmBtn.addEventListener('click', () => {
    if (!cb.checked) return
    saveArchivedIds([])
    archiveViewMode = 'hideArchived'
    clearArchivePanelOpen = false
    loadAndApply()
  })

  panel.appendChild(p)
  panel.appendChild(label)
  actions.appendChild(confirmBtn)
  panel.appendChild(actions)
  parent.appendChild(panel)
}

function ensureNameWrapped(nameCell: HTMLTableCellElement): void {
  if (nameCell.querySelector(`.${CELL_INNER_CLASS}`)) return
  const raw = nameCell.textContent?.trim() ?? ''
  nameCell.textContent = ''
  const inner = document.createElement('div')
  inner.className = CELL_INNER_CLASS
  const span = document.createElement('span')
  span.className = NAME_CLASS
  span.textContent = raw
  inner.appendChild(span)
  nameCell.appendChild(inner)
}

function refreshBar(
  bar: HTMLElement,
  archived: Set<number>,
  archiveFeatureEnabled: boolean,
  table: HTMLTableElement | null,
): void {
  const n = archived.size
  if (!archiveFeatureEnabled) {
    clearArchivePanelOpen = false
  }
  if (n === 0) clearArchivePanelOpen = false

  const archivedRowsVisible =
    archiveFeatureEnabled &&
    n > 0 &&
    (archiveViewMode === 'showAll' || archiveViewMode === 'onlyArchived')
  if (!archivedRowsVisible) clearArchivePanelOpen = false

  const filterHadFocus =
    document.activeElement?.id === NAME_FILTER_INPUT_ID

  bar.innerHTML = ''
  const row = document.createElement('div')
  row.className = 'rta-bar-row'

  const left = document.createElement('div')
  left.className = 'rta-bar-left'

  if (archiveFeatureEnabled) {
    if (n > 0) {
      const showHide = document.createElement('button')
      showHide.type = 'button'
      if (archiveViewMode === 'onlyArchived') {
        showHide.textContent = 'Show all players'
        showHide.title = 'Show every row again (archived and not archived)'
        showHide.addEventListener('click', () => {
          archiveViewMode = 'showAll'
          if (!isExtensionContextValid()) return
          try {
            settingsGet([...STORAGE_KEYS_ARCHIVE], (items) => {
              if (!isExtensionContextValid()) return
              if (chrome.runtime.lastError) return
              applyFromStorage(items as Record<string, unknown>)
            })
          } catch {
            /* Extension context invalidated */
          }
        })
      } else if (archiveViewMode === 'hideArchived') {
        showHide.textContent = `Include archived (${n})`
        showHide.title = 'Show archived rows together with everyone else'
        showHide.addEventListener('click', () => {
          archiveViewMode = 'showAll'
          if (!isExtensionContextValid()) return
          try {
            settingsGet([...STORAGE_KEYS_ARCHIVE], (items) => {
              if (!isExtensionContextValid()) return
              if (chrome.runtime.lastError) return
              applyFromStorage(items as Record<string, unknown>)
            })
          } catch {
            /* Extension context invalidated */
          }
        })
      } else {
        showHide.textContent = 'Exclude archived'
        showHide.title =
          'Hide archived rows (Edit Scores: rows with a rank for a week will stay visible)'
        showHide.addEventListener('click', () => {
          archiveViewMode = 'hideArchived'
          if (!isExtensionContextValid()) return
          try {
            settingsGet([...STORAGE_KEYS_ARCHIVE], (items) => {
              if (!isExtensionContextValid()) return
              if (chrome.runtime.lastError) return
              applyFromStorage(items as Record<string, unknown>)
            })
          } catch {
            /* Extension context invalidated */
          }
        })
      }
      left.appendChild(showHide)

      const onlyBtn = document.createElement('button')
      onlyBtn.type = 'button'
      onlyBtn.textContent = 'Only archived players'
      onlyBtn.title = 'Hide everyone who is not archived'
      onlyBtn.setAttribute('aria-pressed', String(archiveViewMode === 'onlyArchived'))
      onlyBtn.addEventListener('click', () => {
        archiveViewMode =
          archiveViewMode === 'onlyArchived' ? 'hideArchived' : 'onlyArchived'
        if (!isExtensionContextValid()) return
        try {
          settingsGet([...STORAGE_KEYS_ARCHIVE], (items) => {
            if (!isExtensionContextValid()) return
            if (chrome.runtime.lastError) return
            applyFromStorage(items as Record<string, unknown>)
          })
        } catch {
          /* Extension context invalidated */
        }
      })
      left.appendChild(onlyBtn)

      if (archivedRowsVisible) {
        const clear = document.createElement('button')
        clear.type = 'button'
        if (clearArchivePanelOpen) {
          clear.textContent = 'Cancel'
          clear.title = 'Close without clearing the archive list'
          clear.addEventListener('click', () => {
            clearArchivePanelOpen = false
            loadAndApply()
          })
        } else {
          clear.textContent = 'Clear all archived'
          clear.className = CLEAR_ARCHIVE_BAR_BTN_CLASS
          clear.title = 'Remove everyone from the archive list'
          clear.addEventListener('click', () => {
            clearArchivePanelOpen = true
            loadAndApply()
          })
        }
        left.appendChild(clear)
      }
    }
  }

  if (left.childNodes.length > 0) {
    row.appendChild(left)
  }

  if (
    archiveFeatureEnabled &&
    clearArchivePanelOpen &&
    n > 0 &&
    archivedRowsVisible
  ) {
    appendClearArchiveConfirmPanel(row)
  }

  if (
    editScoresNameFilterFeatureEnabled &&
    (EDIT_SCORES_PATH_RE.test(window.location.pathname) ||
      LIST_PLAYERS_PATH_RE.test(window.location.pathname))
  ) {
    const filterWrap = document.createElement('div')
    filterWrap.className = 'rta-bar-filter-wrap'
    const filterLabel = document.createElement('label')
    filterLabel.className = 'rta-bar-filter-label'
    filterLabel.htmlFor = NAME_FILTER_INPUT_ID
    const filterPath = window.location.pathname
    const filterByNameAndMembership =
      LIST_PLAYERS_PATH_RE.test(filterPath) &&
      membershipColumnIndexForFilter !== null
    filterLabel.textContent = filterByNameAndMembership ? 'Filter' : 'Filter by name'
    const field = document.createElement('div')
    field.className = 'rta-name-filter-field'
    const filterInput = document.createElement('input')
    filterInput.type = 'search'
    filterInput.id = NAME_FILTER_INPUT_ID
    filterInput.className = 'rta-name-filter'
    filterInput.placeholder = filterByNameAndMembership
      ? 'Name or membership…'
      : 'Type to filter…'
    filterInput.value = editScoresNameFilter
    filterInput.setAttribute('autocomplete', 'off')
    filterInput.setAttribute('spellcheck', 'false')
    filterInput.setAttribute(
      'aria-label',
      filterByNameAndMembership
        ? 'Filter players by name or membership number'
        : 'Filter players by name',
    )
    const clearFilterBtn = document.createElement('button')
    clearFilterBtn.type = 'button'
    clearFilterBtn.tabIndex = -1
    clearFilterBtn.className = 'rta-name-filter-clear'
    clearFilterBtn.setAttribute(
      'aria-label',
      nameFilterEscClears
        ? 'Clear filter; Esc clears when filter is focused'
        : 'Clear filter',
    )
    clearFilterBtn.title = nameFilterEscClears
      ? 'Clear filter (Esc clears when filter is focused)'
      : 'Clear filter'
    clearFilterBtn.textContent = '×'
    const syncClearVisible = (): void => {
      clearFilterBtn.hidden = filterInput.value.trim() === ''
    }
    filterInput.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        filterInput.select()
      })
    })
    filterInput.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return
      if (!nameFilterEscClears) {
        ev.preventDefault()
        return
      }
      if (filterInput.value.trim() === '') return
      ev.preventDefault()
      editScoresNameFilter = ''
      filterInput.value = ''
      syncClearVisible()
      reapplyNameFilterOnly()
    })
    filterInput.addEventListener('input', () => {
      editScoresNameFilter = filterInput.value
      syncClearVisible()
      reapplyNameFilterOnly()
    })
    clearFilterBtn.addEventListener('click', () => {
      editScoresNameFilter = ''
      filterInput.value = ''
      syncClearVisible()
      reapplyNameFilterOnly()
      filterInput.focus()
    })
    syncClearVisible()
    field.appendChild(filterInput)
    field.appendChild(clearFilterBtn)
    filterWrap.appendChild(filterLabel)
    filterWrap.appendChild(field)
    row.appendChild(filterWrap)
    if (filterHadFocus || !nameFilterAutoFocusDone) {
      requestAnimationFrame(() => {
        filterInput.focus()
      })
    }
  }

  bar.appendChild(row)

  if (document.getElementById(NAME_FILTER_INPUT_ID)) {
    ensureNameFilterWindowKeydownListener()
  } else {
    removeNameFilterWindowKeydownListener()
  }

  syncPlayerThArchivedNote(table, n, archiveFeatureEnabled)
}

function teardownArchiveUi(): void {
  clearArchivePanelOpen = false
  editScoresNameFilter = ''
  lastNameFilterContext = null
  membershipColumnIndexForFilter = null
  nameFilterAutoFocusDone = false
  playerArchiveFeatureEnabled = STORAGE_DEFAULTS.editScoresPlayerArchiveEnabled
  removeNameFilterWindowKeydownListener()
  clearAllPlayerThArchiveLabels()
  document.getElementById(BAR_ID)?.remove()
  document.getElementById(MISSING_RANKS_PANEL_ID)?.remove()
  document.getElementById(STYLE_ID)?.remove()
  for (const tr of document.querySelectorAll<HTMLTableRowElement>(
    'tr[data-rta-archive-init]',
  )) {
    tr.style.display = ''
    tr.classList.remove(ROW_ARCHIVED)
    tr.removeAttribute('data-rta-archive-init')
    tr.removeAttribute('data-rta-archived')
    const inner = tr.querySelector(`.${CELL_INNER_CLASS}`)
    const nc = inner?.closest('td')
    inner?.querySelector(`.${BTN_ARCHIVE}, .${BTN_RESTORE}`)?.remove()
    const sp = inner?.querySelector(`.${NAME_CLASS}`)
    if (sp && nc) {
      nc.textContent = sp.textContent ?? ''
    }
  }
}

function applyFromStorage(items: Record<string, unknown>): void {
  if (!isPlayerArchivePage()) return
  if (items[STORAGE_KEYS.assistantEnabled] === false) {
    teardownArchiveUi()
    return
  }
  const en = items[STORAGE_KEYS.editScoresPlayerArchiveEnabled]
  const archiveFeatureOn =
    typeof en === 'boolean' ? en : STORAGE_DEFAULTS.editScoresPlayerArchiveEnabled

  const nameFilterOpt = items[STORAGE_KEYS.editScoresPlayerNameFilterEnabled]
  editScoresNameFilterFeatureEnabled =
    typeof nameFilterOpt === 'boolean'
      ? nameFilterOpt
      : STORAGE_DEFAULTS.editScoresPlayerNameFilterEnabled
  if (!editScoresNameFilterFeatureEnabled) {
    editScoresNameFilter = ''
  }

  const includeArchOpt = items[STORAGE_KEYS.editScoresPlayerNameFilterIncludeArchived]
  nameFilterIncludeArchivedWhenFiltering =
    typeof includeArchOpt === 'boolean'
      ? includeArchOpt
      : STORAGE_DEFAULTS.editScoresPlayerNameFilterIncludeArchived

  const ctrlFOpt = items[STORAGE_KEYS.editScoresPlayerNameFilterCtrlFToFocus]
  nameFilterCtrlFToFocus =
    typeof ctrlFOpt === 'boolean'
      ? ctrlFOpt
      : STORAGE_DEFAULTS.editScoresPlayerNameFilterCtrlFToFocus

  const escClearsOpt = items[STORAGE_KEYS.editScoresPlayerNameFilterEscClears]
  nameFilterEscClears =
    typeof escClearsOpt === 'boolean'
      ? escClearsOpt
      : STORAGE_DEFAULTS.editScoresPlayerNameFilterEscClears
  const highlightMissingOpt = items[STORAGE_KEYS.editScoresHighlightMissingRanks]
  highlightMissingRanksEnabled =
    typeof highlightMissingOpt === 'boolean'
      ? highlightMissingOpt
      : STORAGE_DEFAULTS.editScoresHighlightMissingRanks

  if (!archiveFeatureOn && !editScoresNameFilterFeatureEnabled) {
    teardownArchiveUi()
    return
  }

  playerArchiveFeatureEnabled = archiveFeatureOn

  const path = window.location.pathname
  const table = EDIT_SCORES_PATH_RE.test(path)
    ? findScoresTable()
    : findListPlayersTable()
  if (!table) return

  injectStyles()

  const archivedArr = normalizeArchivedIds(items[STORAGE_KEYS.editScoresArchivedPlayerIds])
  const archived = new Set(archivedArr)

  membershipColumnIndexForFilter = LIST_PLAYERS_PATH_RE.test(path)
    ? detectMembershipColumnIndex(table, path)
    : null

  if (EDIT_SCORES_PATH_RE.test(path) || LIST_PLAYERS_PATH_RE.test(path)) {
    lastNameFilterContext = { table, archived }
  } else {
    lastNameFilterContext = null
  }

  let bar = document.getElementById(BAR_ID)
  if (!bar) {
    bar = document.createElement('div')
    bar.id = BAR_ID
    table.insertAdjacentElement('beforebegin', bar)
  }
  refreshBar(bar, archived, archiveFeatureOn, table)
  if (EDIT_SCORES_PATH_RE.test(path) && highlightMissingRanksEnabled) {
    renderMissingRanksPanel(bar, table)
  } else {
    document.getElementById(MISSING_RANKS_PANEL_ID)?.remove()
  }

  const archivedForRows = archiveFeatureOn ? archived : new Set<number>()

  const body = table.tBodies[0] ?? table
  for (const tr of body.querySelectorAll<HTMLTableRowElement>('tr')) {
    let playerId: number | null = null
    let nameCell: HTMLTableCellElement | null = null

    let rankSelect: HTMLSelectElement | null = null
    if (EDIT_SCORES_PATH_RE.test(path)) {
      const select = tr.querySelector<HTMLSelectElement>(
        'select.player_ranks[name^="player_"]',
      )
      if (!select) continue
      rankSelect = select
      playerId = parsePlayerIdFromSelect(select)
      const cells = tr.querySelectorAll('td')
      nameCell = cells[0] ?? null
    } else {
      playerId = parsePlayerIdFromListRow(tr)
      const cells = tr.querySelectorAll('td')
      nameCell = (cells[1] as HTMLTableCellElement | undefined) ?? null
    }

    if (playerId === null || !nameCell) continue

    tr.dataset.rtaArchiveInit = '1'
    ensureNameWrapped(nameCell)
    applyRowState(tr, playerId, nameCell, archivedForRows, rankSelect)
  }

  if (EDIT_SCORES_PATH_RE.test(path) && table && !editScoresRankListenerAttached) {
    editScoresRankListenerAttached = true
    table.addEventListener('change', (ev) => {
      const t = ev.target
      if (
        !(t instanceof HTMLSelectElement) ||
        !t.classList.contains('player_ranks') ||
        !/^player_\d+$/.test(t.name)
      ) {
        return
      }
      loadAndApply()
    })
  }

  if (EDIT_SCORES_PATH_RE.test(path)) {
    syncEditScoresRankHeaderCount()
  }
}

function loadAndApply(): void {
  if (!isExtensionContextValid()) return
  try {
    settingsGet([...STORAGE_KEYS_ARCHIVE], (items) => {
      if (!isExtensionContextValid()) return
      if (chrome.runtime.lastError) {
        console.warn('[Redtooth TD Assistant]', chrome.runtime.lastError.message)
        return
      }
      applyFromStorage(items as Record<string, unknown>)
    })
  } catch {
    /* Extension context invalidated */
  }
}

export function initEditScoresPlayerArchive(): void {
  if (!isPlayerArchivePage()) return

  loadAndApply()

  window.setTimeout(loadAndApply, 600)
  window.setTimeout(loadAndApply, 2000)
  window.setTimeout(() => {
    nameFilterAutoFocusDone = true
  }, 2800)

  if (!listenerAttached) {
    listenerAttached = true
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!isExtensionContextValid()) return
      whenStorageChangeApplies(area, changes, () => {
        if (
          !isSyncToggleChange(area, changes) &&
          !changes[STORAGE_KEYS.assistantEnabled] &&
          !changes[STORAGE_KEYS.editScoresPlayerArchiveEnabled] &&
          !changes[STORAGE_KEYS.editScoresPlayerNameFilterEnabled] &&
          !changes[STORAGE_KEYS.editScoresPlayerNameFilterIncludeArchived] &&
          !changes[STORAGE_KEYS.editScoresPlayerNameFilterCtrlFToFocus] &&
          !changes[STORAGE_KEYS.editScoresPlayerNameFilterEscClears] &&
          !changes[STORAGE_KEYS.editScoresHighlightMissingRanks] &&
          !changes[STORAGE_KEYS.editScoresArchivedPlayerIds]
        ) {
          return
        }
        loadAndApply()
      })
    })
  }
}
