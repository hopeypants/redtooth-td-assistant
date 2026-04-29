import { EDIT_SCORES_PATH_RE } from './floating-update-button'
import { isExtensionContextValid } from './extension-context'

let changeListenerAttached = false

function findScoresTable(): HTMLTableElement | null {
  const sel = document.querySelector<HTMLSelectElement>(
    'select.player_ranks[name^="player_"]',
  )
  return sel?.closest('table') ?? null
}

function countPlayersWithRank(table: HTMLTableElement): number {
  let n = 0
  for (const sel of table.querySelectorAll<HTMLSelectElement>(
    'select.player_ranks[name^="player_"]',
  )) {
    const v = Number.parseInt(sel.value, 10)
    if (Number.isFinite(v) && v > 0) n++
  }
  return n
}

/** Strip a trailing "(N player(s))" suffix we may have applied earlier. */
function stripCountSuffix(label: string): string {
  const t = label.replace(/\s+/g, ' ').trim()
  const m = /^(.*?)\s*\(\d+\s+players?\)\s*$/i.exec(t)
  return (m ? m[1] : t).trim()
}

function findRankHeaderTh(table: HTMLTableElement): HTMLTableCellElement | null {
  const sample = table.querySelector<HTMLSelectElement>(
    'select.player_ranks[name^="player_"]',
  )
  const td = sample?.closest('td')
  const col = td?.cellIndex
  if (col !== undefined && col >= 0) {
    const thead = table.tHead
    if (thead?.rows[0]) {
      const c = thead.rows[0].cells[col]
      if (c instanceof HTMLTableCellElement && c.tagName === 'TH') return c
    }
    const r0 = table.rows[0]
    if (r0?.cells[col]?.tagName === 'TH') {
      return r0.cells[col] as HTMLTableCellElement
    }
  }
  for (const th of table.querySelectorAll('th')) {
    const lab = stripCountSuffix((th.textContent ?? '').replace(/\s+/g, ' ').trim())
    if (/^rank$/i.test(lab)) return th as HTMLTableCellElement
  }
  return null
}

export function syncEditScoresRankHeaderCount(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (!isExtensionContextValid()) return
  const table = findScoresTable()
  if (!table) return
  const th = findRankHeaderTh(table)
  if (!th) return
  let base = th.dataset.rtaRankHeadingBase
  if (!base) {
    base = stripCountSuffix(th.textContent ?? '') || 'Rank'
    th.dataset.rtaRankHeadingBase = base
  }
  const n = countPlayersWithRank(table)
  const word = n === 1 ? 'player' : 'players'
  th.textContent = `${base} (${n} ${word})`
}

function ensureChangeListener(): void {
  if (changeListenerAttached) return
  changeListenerAttached = true
  document.addEventListener(
    'change',
    (ev) => {
      const t = ev.target
      if (!(t instanceof HTMLSelectElement)) return
      if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
      if (!t.matches('select.player_ranks[name^="player_"]')) return
      syncEditScoresRankHeaderCount()
    },
    true,
  )
}

export function initEditScoresRankHeaderCount(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (!isExtensionContextValid()) return
  ensureChangeListener()
  syncEditScoresRankHeaderCount()
  window.setTimeout(syncEditScoresRankHeaderCount, 600)
  window.setTimeout(syncEditScoresRankHeaderCount, 2000)
}
