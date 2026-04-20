import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import {
  type WeekCommencingDateFormatId,
  coerceWeekCommencingDateFormatId,
  formatWeekCommencingDate,
  shiftWeekCommencingToVenuePlayDay,
} from '../lib/week-commencing-date-format'
import { isExtensionContextValid } from './extension-context'

/** e.g. `https://www.redtoothpoker.com/venue_admin/ListSeasonScoreWeeks` */
const LIST_SEASON_SCORE_WEEKS_PATH_RE =
  /^\/venue_admin\/ListSeasonScoreWeeks\/?$/i

const DATA_ISO = 'rtaWcIso'
const DATA_HEADING_ORIGINAL = 'rtaWcHeadingOriginal'

const WC_TH_STYLE_ID = 'redtooth-td-assistant-list-season-wc-th'
/** Left-align the Week commencing / Day column header (set via `syncWeekCommencingThClass`). */
const WC_TH_CLASS = 'rta-list-season-wc-th'

function injectWeekCommencingThStyle(): void {
  if (document.getElementById(WC_TH_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = WC_TH_STYLE_ID
  s.textContent = `th.${WC_TH_CLASS}{text-align:left!important;}`
  document.head.appendChild(s)
}

function syncWeekCommencingThClass(): void {
  for (const th of document.querySelectorAll<HTMLElement>('th')) {
    const t = (th.textContent ?? '').trim()
    const isWeekCommencingOrDayCol =
      /^week\s+commencing$/i.test(t) ||
      (/^day$/i.test(t) && th.dataset[DATA_HEADING_ORIGINAL] !== undefined)
    th.classList.toggle(WC_TH_CLASS, isWeekCommencingOrDayCol)
  }
}

const STORAGE_KEYS_PAGE = [
  STORAGE_KEYS.assistantEnabled,
  STORAGE_KEYS.listSeasonScoreWeeksDateFormatEnabled,
  STORAGE_KEYS.listSeasonScoreWeeksVenuePlayDayEnabled,
  STORAGE_KEYS.listSeasonScoreWeeksPlayDayOfWeek,
  STORAGE_KEYS.listSeasonScoreWeeksDateFormat,
] as const

let observer: MutationObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let listenerAttached = false

function isListSeasonScoreWeeksPage(): boolean {
  return LIST_SEASON_SCORE_WEEKS_PATH_RE.test(window.location.pathname)
}

function parseFormat(raw: unknown): WeekCommencingDateFormatId {
  return coerceWeekCommencingDateFormatId(
    raw,
    STORAGE_DEFAULTS.listSeasonScoreWeeksDateFormat as WeekCommencingDateFormatId,
  )
}

function parsePlayDayOfWeek(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return ((Math.trunc(raw) % 7) + 7) % 7
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n)) return ((n % 7) + 7) % 7
  }
  return STORAGE_DEFAULTS.listSeasonScoreWeeksPlayDayOfWeek
}

function applyFormatToCell(
  el: HTMLElement,
  formatId: WeekCommencingDateFormatId,
  venuePlayDayEnabled: boolean,
  playDayOfWeek: number,
): void {
  const raw = (el.textContent ?? '').trim()
  const isoMatch = /^(\d{4}-\d{2}-\d{2})$/.exec(raw)
  const storedIso = el.dataset[DATA_ISO]

  const toDisplayIso = (serverIso: string): string =>
    venuePlayDayEnabled
      ? shiftWeekCommencingToVenuePlayDay(serverIso, playDayOfWeek)
      : serverIso

  if (isoMatch) {
    const iso = isoMatch[1]!
    el.dataset[DATA_ISO] = iso
    const displayIso = toDisplayIso(iso)
    el.textContent =
      formatId === 'iso'
        ? displayIso
        : formatWeekCommencingDate(displayIso, formatId)
    return
  }

  if (storedIso) {
    const displayIso = toDisplayIso(storedIso)
    el.textContent =
      formatId === 'iso'
        ? displayIso
        : formatWeekCommencingDate(displayIso, formatId)
  }
}

function walkAndApply(
  formatId: WeekCommencingDateFormatId,
  venuePlayDayEnabled: boolean,
  playDayOfWeek: number,
): void {
  if (!isListSeasonScoreWeeksPage()) return
  const cells = document.querySelectorAll<HTMLElement>('td, th')
  for (const el of cells) {
    applyFormatToCell(el, formatId, venuePlayDayEnabled, playDayOfWeek)
  }
}

/** “Week commencing” → “Day” when showing venue game day. */
function applyWeekCommencingColumnHeading(useDayLabel: boolean): void {
  const ths = document.querySelectorAll<HTMLElement>('th')
  for (const th of ths) {
    const t = (th.textContent ?? '').trim()
    if (useDayLabel) {
      if (/^week\s+commencing$/i.test(t)) {
        if (th.dataset[DATA_HEADING_ORIGINAL] === undefined) {
          th.dataset[DATA_HEADING_ORIGINAL] = th.textContent ?? t
        }
        th.textContent = 'Day'
      }
    } else {
      const orig = th.dataset[DATA_HEADING_ORIGINAL]
      if (orig !== undefined) {
        th.textContent = orig
        delete th.dataset[DATA_HEADING_ORIGINAL]
      }
    }
  }
  syncWeekCommencingThClass()
}

function ensureMutationObserver(): void {
  if (observer || !document.body) return
  observer = new MutationObserver(() => {
    if (!isExtensionContextValid()) return
    try {
      settingsGet([...STORAGE_KEYS_PAGE], (items) => {
        if (!isExtensionContextValid()) return
        if (chrome.runtime.lastError) return
        scheduleApply(items as Record<string, unknown>)
      })
    } catch {
      /* ignore */
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function applyFromStorage(items: Record<string, unknown>): void {
  if (!isListSeasonScoreWeeksPage()) return
  if (items[STORAGE_KEYS.assistantEnabled] === false) {
    applyWeekCommencingColumnHeading(false)
    if (observer) {
      observer.disconnect()
      observer = null
    }
    return
  }
  const formatEnabled =
    items[STORAGE_KEYS.listSeasonScoreWeeksDateFormatEnabled] !== false
  const formatId: WeekCommencingDateFormatId = formatEnabled
    ? parseFormat(items[STORAGE_KEYS.listSeasonScoreWeeksDateFormat])
    : 'iso'
  const venuePlayDayEnabled =
    formatEnabled &&
    items[STORAGE_KEYS.listSeasonScoreWeeksVenuePlayDayEnabled] === true
  const playDay = parsePlayDayOfWeek(
    items[STORAGE_KEYS.listSeasonScoreWeeksPlayDayOfWeek],
  )
  walkAndApply(formatId, venuePlayDayEnabled, playDay)
  applyWeekCommencingColumnHeading(venuePlayDayEnabled)
  ensureMutationObserver()
}

function scheduleApply(items: Record<string, unknown>): void {
  if (debounceTimer !== undefined) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = undefined
    applyFromStorage(items)
  }, 120)
}

function loadAndApply(): void {
  if (!isExtensionContextValid()) return
  try {
    settingsGet([...STORAGE_KEYS_PAGE], (items) => {
      if (!isExtensionContextValid()) return
      if (chrome.runtime.lastError) return
      applyFromStorage(items as Record<string, unknown>)
    })
  } catch {
    /* Extension context invalidated */
  }
}

export function initListSeasonScoreWeeksDates(): void {
  if (!isListSeasonScoreWeeksPage()) return

  injectWeekCommencingThStyle()
  loadAndApply()
  window.setTimeout(loadAndApply, 400)
  window.setTimeout(loadAndApply, 1500)

  if (!listenerAttached) {
    listenerAttached = true
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!isExtensionContextValid()) return
      whenStorageChangeApplies(area, changes, () => {
        if (
          !isSyncToggleChange(area, changes) &&
          !changes[STORAGE_KEYS.assistantEnabled] &&
          !changes[STORAGE_KEYS.listSeasonScoreWeeksDateFormatEnabled] &&
          !changes[STORAGE_KEYS.listSeasonScoreWeeksVenuePlayDayEnabled] &&
          !changes[STORAGE_KEYS.listSeasonScoreWeeksPlayDayOfWeek] &&
          !changes[STORAGE_KEYS.listSeasonScoreWeeksDateFormat]
        ) {
          return
        }
        loadAndApply()
      })
    })
  }
}
