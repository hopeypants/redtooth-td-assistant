import { EDIT_SCORES_PATH_RE } from './floating-update-button'
import { isExtensionContextValid } from './extension-context'

const STYLE_ID = 'redtooth-td-assistant-rank-row-focus-style'
const ROW_CLASS = 'rta-rank-row-focused'

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `tr.${ROW_CLASS} td{background-color:rgba(191,219,254,0.72) !important;}`
  document.head.appendChild(s)
}

function rankSelectFromTarget(t: EventTarget | null): HTMLSelectElement | null {
  if (!(t instanceof HTMLSelectElement)) return null
  return t.matches('select.player_ranks[name^="player_"]') ? t : null
}

function onFocusIn(ev: FocusEvent): void {
  if (!isExtensionContextValid()) return
  const sel = rankSelectFromTarget(ev.target)
  if (!sel) return
  const tr = sel.closest('tr')
  if (tr) tr.classList.add(ROW_CLASS)
}

function onFocusOut(ev: FocusEvent): void {
  if (!isExtensionContextValid()) return
  const sel = rankSelectFromTarget(ev.target)
  if (!sel) return
  const tr = sel.closest('tr')
  if (tr) tr.classList.remove(ROW_CLASS)
}

let listenersAttached = false

export function initEditScoresRankRowFocus(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (!isExtensionContextValid()) return
  if (listenersAttached) return
  listenersAttached = true
  ensureStyles()
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('focusout', onFocusOut, true)
}
