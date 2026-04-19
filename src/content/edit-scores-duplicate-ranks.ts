import {
  STORAGE_DEFAULTS,
  STORAGE_KEYS,
  type EditScoresDuplicateRankBehavior,
} from '../lib/storage-keys'
import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { isExtensionContextValid } from './extension-context'
import { EDIT_SCORES_PATH_RE } from './floating-update-button'

const WARNING_ID = 'redtooth-td-assistant-duplicate-rank-warning'
const STYLE_ID = 'redtooth-td-assistant-duplicate-rank-style'
const SELECT_DUP_CLASS = 'rta-dup-rank-select'
const ROW_DUP_FILTER_HIDDEN_CLASS = 'rta-dup-filter-hidden'
/** Same id as `floating-update-button.ts` — extension floating Update control. */
const FLOATING_UPDATE_BTN_ID = 'redtooth-td-assistant-floating-btnUpdate'
const UPDATE_BTN_DUP_BLOCK_CLASS = 'rta-update-blocked-by-dups'
const DUP_BLOCK_TITLE = 'Fix duplicate ranks before updating.'
/** When true, non–duplicate rows are hidden (highlight mode only). */
let duplicateRowsFilterOnlyActive = false
/** Archive bar — warning is inserted after this when present. */
const ARCHIVE_BAR_ID = 'redtooth-td-assistant-player-archive-bar'

const STORAGE_KEYS_DUP = [
  STORAGE_KEYS.assistantEnabled,
  STORAGE_KEYS.editScoresDuplicateRankBehavior,
] as const

let optionTemplate: HTMLOptionElement[] | null = null
let currentMode: EditScoresDuplicateRankBehavior = 'off'
let tableObserver: MutationObserver | null = null
/** Coalesce table observer callbacks (e.g. many nodes added) without waiting a frame. */
let tableMutationFlushPending = false
let tableMutationFlushTable: HTMLTableElement | null = null
let tableMutationFlushGeneration = 0
let storageListenerAttached = false
let documentChangeAttached = false
let tableWaitObserver: MutationObserver | null = null
let tableWaitTimeout: ReturnType<typeof setTimeout> | undefined
/** Invalidates pending deferred work when `mountFromSettings` runs again. */
let mountGeneration = 0
/** Prevents table MutationObserver from re-running apply while we mutate selects (prevent mode replaces options). */
let suppressTableMutationObserver = false

function normalizeMode(raw: unknown): EditScoresDuplicateRankBehavior {
  if (raw === 'off' || raw === 'highlight' || raw === 'prevent') return raw
  return STORAGE_DEFAULTS.editScoresDuplicateRankBehavior
}

function findScoresTable(): HTMLTableElement | null {
  const sel = document.querySelector<HTMLSelectElement>(
    'select.player_ranks[name^="player_"]',
  )
  return sel?.closest('table') ?? null
}

function getRankSelects(table: HTMLTableElement): HTMLSelectElement[] {
  return Array.from(
    table.querySelectorAll<HTMLSelectElement>('select.player_ranks[name^="player_"]'),
  )
}

function rankValueIsScoring(v: string): boolean {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = [
    `select.${SELECT_DUP_CLASS}{outline:none!important;box-shadow:none!important;background:#feb2b2!important;color:#1a202c!important;border:1px solid rgba(197,48,48,.35)!important;border-radius:4px;}`,
    `#${WARNING_ID}{margin:0 0 10px 0;padding:10px 12px;background:#fff5f5;border:1px solid #fc8181;border-radius:6px;font:13px/1.45 system-ui,sans-serif;color:#742a2a;display:flex;flex-wrap:nowrap;align-items:center;gap:8px 14px;max-width:100%;box-sizing:border-box;overflow-x:auto;}`,
    `#${WARNING_ID}[hidden]{display:none!important;}`,
    `#${WARNING_ID} .rta-dup-warn-msg{flex:1 1 auto;min-width:0;}`,
    `#${WARNING_ID} .rta-dup-warn-actions{flex:0 0 auto;display:inline-flex;flex-wrap:nowrap;align-items:center;gap:4px 8px;}`,
    `#${WARNING_ID} a.rta-dup-filter-link,#${WARNING_ID} a.rta-dup-filter-clear{color:#c53030;font-weight:600;text-decoration:underline;cursor:pointer;}`,
    `#${WARNING_ID} a.rta-dup-filter-link:hover,#${WARNING_ID} a.rta-dup-filter-clear:hover{color:#9b2c2c;}`,
    `tr.${ROW_DUP_FILTER_HIDDEN_CLASS}{display:none!important;}`,
    `input.${UPDATE_BTN_DUP_BLOCK_CLASS},button.${UPDATE_BTN_DUP_BLOCK_CLASS}{opacity:0.48!important;cursor:not-allowed!important;filter:grayscale(0.45);box-shadow:none!important;background:#e2e8f0!important;color:#64748b!important;border-color:#cbd5e1!important;}`,
  ].join('')
  document.head.appendChild(s)
}

/** Place the warning after the archive bar when it exists; otherwise before the scores table. */
function positionWarningEl(el: HTMLElement): void {
  const bar = document.getElementById(ARCHIVE_BAR_ID)
  const table = findScoresTable()
  if (bar?.parentNode) {
    bar.parentNode.insertBefore(el, bar.nextSibling)
    return
  }
  if (table?.parentNode) {
    table.parentNode.insertBefore(el, table)
    return
  }
  if (!el.parentNode) {
    document.body.appendChild(el)
  }
}

function ensureWarningEl(): HTMLElement {
  let el = document.getElementById(WARNING_ID)
  if (!el || !el.querySelector('.rta-dup-warn-actions')) {
    el?.remove()
    el = document.createElement('div')
    el.id = WARNING_ID
    el.setAttribute('role', 'alert')
    el.hidden = true

    const msg = document.createElement('span')
    msg.className = 'rta-dup-warn-msg'
    msg.textContent =
      'Two or more players have the same rank selected. Change scores before saving.'

    const actions = document.createElement('span')
    actions.className = 'rta-dup-warn-actions'

    const aShow = document.createElement('a')
    aShow.href = '#'
    aShow.className = 'rta-dup-filter-link'
    aShow.textContent = 'Show only rows with duplicate ranks'

    const aClear = document.createElement('a')
    aClear.href = '#'
    aClear.className = 'rta-dup-filter-clear'
    aClear.textContent = 'Show all rows'
    aClear.hidden = true

    actions.append(aShow, document.createTextNode(' '), aClear)
    el.append(msg, actions)
    wireWarningDupFilterLinks(el)
  }
  positionWarningEl(el)
  return el
}

function captureTemplate(selects: HTMLSelectElement[]): void {
  if (optionTemplate && optionTemplate.length > 0) return
  const first = selects[0]
  if (!first) return
  optionTemplate = Array.from(first.options).map((o) => {
    const c = document.createElement('option')
    c.value = o.value
    c.textContent = o.textContent
    return c
  })
}

function restoreNativeOptions(selects: HTMLSelectElement[]): void {
  if (!optionTemplate || optionTemplate.length === 0) return
  for (const sel of selects) {
    const cur = sel.value
    const frag = document.createDocumentFragment()
    for (const tmpl of optionTemplate) {
      frag.appendChild(tmpl.cloneNode(true))
    }
    sel.innerHTML = ''
    sel.appendChild(frag)
    if ([...sel.options].some((o) => o.value === cur)) {
      sel.value = cur
    } else {
      sel.value = '0'
    }
  }
}

function clearHighlights(selects: HTMLSelectElement[]): void {
  for (const sel of selects) {
    sel.classList.remove(SELECT_DUP_CLASS)
  }
}

/** Selects whose rank (>0) is chosen by more than one player. */
function computeDuplicateRankSelectSet(
  selects: HTMLSelectElement[],
): Set<HTMLSelectElement> {
  const valueToSelects = new Map<string, HTMLSelectElement[]>()
  for (const sel of selects) {
    const v = sel.value
    if (!rankValueIsScoring(v)) continue
    const arr = valueToSelects.get(v) ?? []
    arr.push(sel)
    valueToSelects.set(v, arr)
  }
  const dupSet = new Set<HTMLSelectElement>()
  for (const [, arr] of valueToSelects) {
    if (arr.length > 1) {
      for (const s of arr) dupSet.add(s)
    }
  }
  return dupSet
}

function clearDuplicateRowFilter(table: HTMLTableElement): void {
  duplicateRowsFilterOnlyActive = false
  const tbody = table.tBodies[0] ?? table
  for (const tr of tbody.querySelectorAll(`tr.${ROW_DUP_FILTER_HIDDEN_CLASS}`)) {
    tr.classList.remove(ROW_DUP_FILTER_HIDDEN_CLASS)
  }
}

function syncDuplicateRowFilterVisibility(
  table: HTMLTableElement,
  dupSet: Set<HTMLSelectElement>,
): void {
  const tbody = table.tBodies[0] ?? table
  for (const tr of tbody.querySelectorAll('tr')) {
    const sel = tr.querySelector<HTMLSelectElement>(
      'select.player_ranks[name^="player_"]',
    )
    if (!sel) continue
    const show =
      !duplicateRowsFilterOnlyActive ||
      (dupSet.size > 0 && dupSet.has(sel))
    tr.classList.toggle(ROW_DUP_FILTER_HIDDEN_CLASS, !show)
  }
}

function syncDupFilterLinkUI(warn: HTMLElement): void {
  const showOnly = warn.querySelector<HTMLElement>('.rta-dup-filter-link')
  const showAll = warn.querySelector<HTMLElement>('.rta-dup-filter-clear')
  if (showOnly) showOnly.hidden = duplicateRowsFilterOnlyActive
  if (showAll) showAll.hidden = !duplicateRowsFilterOnlyActive
}

function wireWarningDupFilterLinks(warn: HTMLElement): void {
  if (warn.dataset.rtaDupFilterWired === '1') return
  warn.dataset.rtaDupFilterWired = '1'
  warn.addEventListener('click', (e) => {
    const t = e.target
    if (!(t instanceof HTMLElement)) return
    if (t.closest('a.rta-dup-filter-link')) {
      e.preventDefault()
      duplicateRowsFilterOnlyActive = true
      const table = findScoresTable()
      if (table) {
        const selects = getRankSelects(table)
        const dupSet = computeDuplicateRankSelectSet(selects)
        syncDuplicateRowFilterVisibility(table, dupSet)
      }
      syncDupFilterLinkUI(warn)
    } else if (t.closest('a.rta-dup-filter-clear')) {
      e.preventDefault()
      duplicateRowsFilterOnlyActive = false
      const table = findScoresTable()
      if (table) {
        const selects = getRankSelects(table)
        const dupSet = computeDuplicateRankSelectSet(selects)
        syncDuplicateRowFilterVisibility(table, dupSet)
      }
      syncDupFilterLinkUI(warn)
    }
  })
}

function applyHighlight(selects: HTMLSelectElement[]): void {
  const dupSet = computeDuplicateRankSelectSet(selects)
  for (const sel of selects) {
    const dup = dupSet.has(sel)
    sel.classList.toggle(SELECT_DUP_CLASS, dup)
  }
  const warn = ensureWarningEl()
  if (dupSet.size === 0) {
    duplicateRowsFilterOnlyActive = false
    warn.hidden = true
    const table = selects[0]?.closest('table')
    if (table) {
      clearDuplicateRowFilter(table as HTMLTableElement)
    }
    return
  }
  warn.hidden = false
  syncDupFilterLinkUI(warn)
  const table = selects[0]?.closest('table')
  if (table) {
    syncDuplicateRowFilterVisibility(table as HTMLTableElement, dupSet)
    positionWarningEl(warn)
  }
}

function collectNativeAndFloatingUpdateControls(): Set<
  HTMLButtonElement | HTMLInputElement
> {
  const out = new Set<HTMLButtonElement | HTMLInputElement>()
  const add = (el: Element | null): void => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      out.add(el)
    }
  }
  add(document.getElementById('btnUpdate'))
  add(document.querySelector('input[name="btnUpdate"][type="button"]'))
  add(document.getElementById(FLOATING_UPDATE_BTN_ID))
  add(
    document.querySelector<HTMLInputElement>(
      'input.btn[type="button"][value="Update"]',
    ),
  )
  return out
}

function syncUpdateButtonsForDuplicateRanks(
  table: HTMLTableElement,
  mode: EditScoresDuplicateRankBehavior,
): void {
  if (mode === 'off' || !table.isConnected) {
    setUpdateButtonsBlockedByDuplicates(false)
    return
  }
  const selects = getRankSelects(table)
  if (selects.length === 0) {
    setUpdateButtonsBlockedByDuplicates(false)
    return
  }
  const dupSet = computeDuplicateRankSelectSet(selects)
  setUpdateButtonsBlockedByDuplicates(dupSet.size > 0)
}

function setUpdateButtonsBlockedByDuplicates(block: boolean): void {
  for (const el of collectNativeAndFloatingUpdateControls()) {
    if (block) {
      if (el.dataset.rtaDupTitleBackup === undefined) {
        el.dataset.rtaDupTitleBackup = el.title
      }
      el.classList.add(UPDATE_BTN_DUP_BLOCK_CLASS)
      el.disabled = true
      el.title = DUP_BLOCK_TITLE
    } else {
      el.classList.remove(UPDATE_BTN_DUP_BLOCK_CLASS)
      el.disabled = false
      if (el.dataset.rtaDupTitleBackup !== undefined) {
        el.title = el.dataset.rtaDupTitleBackup
        delete el.dataset.rtaDupTitleBackup
      }
    }
  }
}

function applyPrevent(selects: HTMLSelectElement[]): void {
  captureTemplate(selects)
  if (!optionTemplate || optionTemplate.length === 0) return

  for (const sel of selects) {
    const cur = sel.value
    const taken = new Set<string>()
    for (const other of selects) {
      if (other === sel) continue
      const v = other.value
      if (rankValueIsScoring(v)) taken.add(v)
    }
    const frag = document.createDocumentFragment()
    for (const tmpl of optionTemplate) {
      const v = tmpl.value
      const n = Number.parseInt(v, 10)
      const allow =
        !Number.isFinite(n) || n <= 0 || !taken.has(v) || v === cur
      if (allow) {
        frag.appendChild(tmpl.cloneNode(true))
      }
    }
    sel.innerHTML = ''
    sel.appendChild(frag)
    if ([...sel.options].some((o) => o.value === cur)) {
      sel.value = cur
    } else {
      sel.value = '0'
    }
  }
}

function applyMode(table: HTMLTableElement, mode: EditScoresDuplicateRankBehavior): void {
  suppressTableMutationObserver = true
  try {
    const selects = getRankSelects(table)
    if (selects.length === 0) return

    if (mode === 'off') {
      clearDuplicateRowFilter(table)
      if (optionTemplate) {
        restoreNativeOptions(selects)
      }
      clearHighlights(selects)
      const w = document.getElementById(WARNING_ID)
      if (w) w.hidden = true
      optionTemplate = null
      return
    }

    captureTemplate(selects)

    if (mode === 'highlight') {
      restoreNativeOptions(selects)
      optionTemplate = null
      captureTemplate(selects)
      applyHighlight(selects)
    } else {
      clearDuplicateRowFilter(table)
      clearHighlights(selects)
      const w = document.getElementById(WARNING_ID)
      if (w) w.hidden = true
      applyPrevent(selects)
    }
  } finally {
    suppressTableMutationObserver = false
    syncUpdateButtonsForDuplicateRanks(table, mode)
  }
}

function tick(table: HTMLTableElement): void {
  if (!isExtensionContextValid()) return
  if (currentMode === 'off') return
  applyMode(table, currentMode)
}

function scheduleTableMutationFlush(table: HTMLTableElement): void {
  tableMutationFlushTable = table
  if (tableMutationFlushPending) return
  tableMutationFlushPending = true
  const gen = tableMutationFlushGeneration
  queueMicrotask(() => {
    tableMutationFlushPending = false
    if (gen !== tableMutationFlushGeneration) return
    const t = tableMutationFlushTable
    tableMutationFlushTable = null
    if (!t || !isExtensionContextValid()) return
    tick(t)
  })
}

function onRankChange(ev: Event): void {
  if (currentMode === 'off') return
  const t = ev.target
  if (!(t instanceof HTMLSelectElement)) return
  if (!t.matches('select.player_ranks[name^="player_"]')) return
  const table = t.closest('table')
  if (!table) return
  const htmlTable = table as HTMLTableElement
  /**
   * Replacing `<option>` nodes in the same turn as the `change` event breaks native
   * `<select>` behaviour in Chromium (dropdown stops opening / selection glitches).
   * Run after the browser commits the new value.
   */
  window.setTimeout(() => {
    if (!isExtensionContextValid()) return
    if (currentMode === 'off') return
    if (!htmlTable.isConnected) return
    tick(htmlTable)
  }, 0)
}

function attachDocumentChange(): void {
  if (documentChangeAttached) return
  documentChangeAttached = true
  document.addEventListener('change', onRankChange, true)
}

function observeTable(table: HTMLTableElement): void {
  tableObserver?.disconnect()
  tableObserver = new MutationObserver(() => {
    if (suppressTableMutationObserver) return
    if (currentMode === 'off') return
    scheduleTableMutationFlush(table)
  })
  /**
   * Only `<tr>` add/remove on the body — not `subtree` under rows. Observing the full
   * table with `subtree: true` records every `<option>` change in prevent mode, which
   * re-enters `tick` in a microtask loop and freezes the page.
   */
  const tbody = table.tBodies[0] ?? table
  tableObserver.observe(tbody, { childList: true, subtree: false })
}

function teardownTableObservers(): void {
  tableMutationFlushGeneration += 1
  tableMutationFlushPending = false
  tableMutationFlushTable = null
  tableObserver?.disconnect()
  tableObserver = null
}

function clearTableWait(): void {
  tableWaitObserver?.disconnect()
  tableWaitObserver = null
  if (tableWaitTimeout !== undefined) {
    clearTimeout(tableWaitTimeout)
    tableWaitTimeout = undefined
  }
}

function ensureTableWaitObserver(items: Record<string, unknown>): void {
  if (tableWaitObserver) return
  tableWaitObserver = new MutationObserver(() => {
    if (!findScoresTable()) return
    clearTableWait()
    mountFromSettings(items)
  })
  tableWaitObserver.observe(document.body, { childList: true, subtree: true })
  tableWaitTimeout = window.setTimeout(() => {
    clearTableWait()
  }, 10_000)
}

function mountFromSettings(items: Record<string, unknown>): void {
  teardownTableObservers()
  clearTableWait()
  mountGeneration += 1
  const gen = mountGeneration
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return

  if (items[STORAGE_KEYS.assistantEnabled] === false) {
    currentMode = 'off'
    const table = findScoresTable()
    if (table) applyMode(table, 'off')
    return
  }

  const mode = normalizeMode(items[STORAGE_KEYS.editScoresDuplicateRankBehavior])
  currentMode = mode

  const table = findScoresTable()
  if (!table) {
    ensureTableWaitObserver(items)
    return
  }

  injectStyle()
  attachDocumentChange()

  if (mode === 'off') {
    applyMode(table, 'off')
    return
  }

  /**
   * Defer first paint of highlight/prevent so we do not replace options in the same
   * stack as Redtooth’s own init (same class of bug as deferred `change` handling).
   */
  window.setTimeout(() => {
    if (gen !== mountGeneration) return
    if (!isExtensionContextValid()) return
    if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
    if (currentMode !== mode) return
    const t = findScoresTable()
    if (!t) return
    applyMode(t, mode)
    observeTable(t)
  }, 0)
}

export function initEditScoresDuplicateRanks(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (!isExtensionContextValid()) return

  try {
    settingsGet([...STORAGE_KEYS_DUP], (items) => {
      if (!isExtensionContextValid()) return
      const err = chrome.runtime.lastError
      const payload = err
        ? ({
            [STORAGE_KEYS.assistantEnabled]: STORAGE_DEFAULTS.assistantEnabled,
            [STORAGE_KEYS.editScoresDuplicateRankBehavior]:
              STORAGE_DEFAULTS.editScoresDuplicateRankBehavior,
          } as Record<string, unknown>)
        : (items as Record<string, unknown>)
      mountFromSettings(payload)
    })
  } catch {
    /* invalid extension context */
  }

  if (!storageListenerAttached) {
    storageListenerAttached = true
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!isExtensionContextValid()) return
      whenStorageChangeApplies(area, changes, () => {
        if (
          !isSyncToggleChange(area, changes) &&
          !changes[STORAGE_KEYS.assistantEnabled] &&
          !changes[STORAGE_KEYS.editScoresDuplicateRankBehavior]
        ) {
          return
        }
        try {
          settingsGet([...STORAGE_KEYS_DUP], (items) => {
            if (!isExtensionContextValid()) return
            if (chrome.runtime.lastError) return
            mountFromSettings(items as Record<string, unknown>)
          })
        } catch {
          /* ignore */
        }
      })
    })
  }
}
