import {
  decodeWeekId,
  encodeWeekId,
  leagueYearLabel,
  seasonIndexFromDate,
  seasonIndexToYearSeason,
  SEASONS_PER_LEAGUE_YEAR,
  WEEKS_PER_SEASON,
} from '../lib/game-week-calendar'
import { settingsGet } from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'

const EDIT_SCORES_PATH_RE = /^\/venue_admin\/editscores\/(\d+)\/?$/

const NAV_CONTAINER_ID = 'redtooth-td-assistant-editscores-nav'

export type EditScoresNavSettings = {
  enabled: boolean
  showPrevNext: boolean
  showJump: boolean
  seasonsPast: number
  seasonsFuture: number
}

function parseEditScoresId(pathname: string): number | null {
  const m = pathname.match(EDIT_SCORES_PATH_RE)
  if (!m) return null
  return Number.parseInt(m[1], 10)
}

function buildEditScoresUrl(id: number): string {
  const u = new URL(window.location.href)
  u.pathname = `/venue_admin/editscores/${id}`
  u.search = ''
  u.hash = ''
  return u.toString()
}

function readSettings(
  items: Record<string, unknown>,
): EditScoresNavSettings {
  const b = (key: keyof typeof STORAGE_KEYS, d: boolean): boolean => {
    const k = STORAGE_KEYS[key]
    const v = items[k]
    return typeof v === 'boolean' ? v : d
  }
  const n = (key: keyof typeof STORAGE_KEYS, d: number): number => {
    const k = STORAGE_KEYS[key]
    const v = items[k]
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.min(24, Math.floor(v)))
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number.parseInt(v, 10)
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(24, parsed))
    }
    return d
  }
  return {
    enabled: b('editScoresNavEnabled', STORAGE_DEFAULTS.editScoresNavEnabled),
    showPrevNext: b(
      'editScoresShowPrevNext',
      STORAGE_DEFAULTS.editScoresShowPrevNext,
    ),
    showJump: b('editScoresShowJump', STORAGE_DEFAULTS.editScoresShowJump),
    seasonsPast: n(
      'editScoresSeasonsPast',
      STORAGE_DEFAULTS.editScoresSeasonsPast,
    ),
    seasonsFuture: n(
      'editScoresSeasonsFuture',
      STORAGE_DEFAULTS.editScoresSeasonsFuture,
    ),
  }
}

function seasonIndexFromDecoded(id: number): number {
  const { yearOffset, season } = decodeWeekId(id)
  return yearOffset * SEASONS_PER_LEAGUE_YEAR + (season - 1)
}

function createNav(
  currentId: number,
  settings: EditScoresNavSettings,
): HTMLElement | null {
  if (!settings.showPrevNext && !settings.showJump) return null

  const wrap = document.createElement('div')
  wrap.id = NAV_CONTAINER_ID
  wrap.style.cssText = [
    'display:flex',
    'flex-wrap:wrap',
    'align-items:center',
    'gap:10px 12px',
    'margin:12px 0 10px',
    'padding:10px 12px',
    'width:100%',
    'box-sizing:border-box',
    'background:#f4f6fa',
    'border:1px solid #d8dee8',
    'border-radius:6px',
    'font:14px/1.4 system-ui,-apple-system,sans-serif',
    'color:#1a1a1a',
  ].join(';')

  const label = document.createElement('span')
  label.style.fontWeight = '600'
  label.textContent = 'Game weeks'

  const children: Node[] = [label]

  if (settings.showPrevNext) {
    const prev = document.createElement('button')
    prev.type = 'button'
    prev.textContent = 'Previous'
    prev.title = 'Previous game week'
    styleButton(prev)
    prev.addEventListener('click', () => {
      if (currentId > 1) {
        window.location.assign(buildEditScoresUrl(currentId - 1))
      }
    })

    const next = document.createElement('button')
    next.type = 'button'
    next.textContent = 'Next'
    next.title = 'Next game week'
    styleButton(next)
    next.addEventListener('click', () => {
      window.location.assign(buildEditScoresUrl(currentId + 1))
    })

    children.push(prev, next)
  }

  if (settings.showJump) {
    const jumpLabel = document.createElement('label')
    jumpLabel.style.cssText =
      'display:flex;align-items:center;gap:8px;margin:0;margin-left:auto;'
    const jumpText = document.createElement('span')
    jumpText.textContent = 'Jump to'
    jumpText.style.whiteSpace = 'nowrap'

    const select = document.createElement('select')
    select.setAttribute('aria-label', 'Jump to game week')
    select.style.cssText =
      'font:inherit;padding:4px 8px;border-radius:4px;border:1px solid #b8c0cc;min-width:16rem;background:#fff;'

    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = 'Select season & week…'
    select.appendChild(placeholder)

    const now = new Date()
    const currentSeasonIdx = seasonIndexFromDate(now)
    const minIdx =
      currentSeasonIdx - settings.seasonsPast
    const maxIdx =
      currentSeasonIdx + settings.seasonsFuture

    for (let si = minIdx; si <= maxIdx; si++) {
      const { yearOffset, season } = seasonIndexToYearSeason(si)
      const ylabel = leagueYearLabel(yearOffset)
      for (let w = 1; w <= WEEKS_PER_SEASON; w++) {
        const id = encodeWeekId(yearOffset, season, w)
        const opt = document.createElement('option')
        opt.value = String(id)
        opt.textContent = `${ylabel} · Season ${season} · Week ${w}`
        select.appendChild(opt)
      }
    }

    const syncSelect = (): void => {
      const idx = seasonIndexFromDecoded(currentId)
      if (idx >= minIdx && idx <= maxIdx) {
        select.value = String(currentId)
      } else {
        select.value = ''
      }
    }

    select.addEventListener('change', () => {
      const v = select.value
      if (!v) return
      const id = Number.parseInt(v, 10)
      if (Number.isFinite(id) && id !== currentId) {
        window.location.assign(buildEditScoresUrl(id))
      }
    })

    syncSelect()
    jumpLabel.append(jumpText, select)
    children.push(jumpLabel)
  }

  wrap.append(...children)
  return wrap
}

function styleButton(el: HTMLButtonElement): void {
  el.style.cssText = [
    'font:inherit',
    'padding:6px 14px',
    'border-radius:4px',
    'border:1px solid #2c5282',
    'background:#2b6cb0',
    'color:#fff',
    'cursor:pointer',
  ].join(';')
  el.addEventListener('mouseenter', () => {
    if (!el.disabled) el.style.background = '#2c5282'
  })
  el.addEventListener('mouseleave', () => {
    el.style.background = '#2b6cb0'
  })
}

const STORAGE_GET_KEYS = Object.values(STORAGE_KEYS)

export function initEditScoresWeekNav(): void {
  const id = parseEditScoresId(window.location.pathname)
  if (id === null) return

  const h1 = document.querySelector('.grid .unit.whole h1')
  if (!h1 || h1.textContent?.trim() !== 'Edit Scores') return

  if (document.getElementById(NAV_CONTAINER_ID)) return

  if (!isExtensionContextValid()) return
  try {
    settingsGet(STORAGE_GET_KEYS, (items) => {
      if (!isExtensionContextValid()) return
      const err = chrome.runtime.lastError
      if (err) {
        console.warn('[Redtooth TD Assistant]', err.message)
        return
      }

      const settings = readSettings(items as Record<string, unknown>)
      if (!settings.enabled) return

      const nav = createNav(id, settings)
      if (nav) h1.insertAdjacentElement('afterend', nav)
    })
  } catch {
    /* Extension context invalidated */
  }
}
