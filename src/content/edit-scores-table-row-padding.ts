import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'
import { EDIT_SCORES_PATH_RE } from './floating-update-button'

const STYLE_ID = 'redtooth-td-assistant-styled-tbl-padding'

/** Site default horizontal padding from `.styledTbl td { padding: 15px; }`. */
const HORIZONTAL_PX = 15

function clampVerticalPx(n: number): number {
  if (!Number.isFinite(n)) return STORAGE_DEFAULTS.editScoresTableCellPaddingVerticalPx
  return Math.max(2, Math.min(40, Math.floor(n)))
}

function applyPaddingStyle(px: number): void {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  const v = clampVerticalPx(px)
  el.textContent = `.styledTbl td{padding-top:${v}px;padding-bottom:${v}px;padding-left:${HORIZONTAL_PX}px;padding-right:${HORIZONTAL_PX}px;}`
}

function removePaddingStyle(): void {
  document.getElementById(STYLE_ID)?.remove()
}

function applyFromItems(items: Record<string, unknown>): void {
  removePaddingStyle()
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (items[STORAGE_KEYS.assistantEnabled] === false) return
  const raw = items[STORAGE_KEYS.editScoresTableCellPaddingVerticalPx]
  const px =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : STORAGE_DEFAULTS.editScoresTableCellPaddingVerticalPx
  applyPaddingStyle(px)
}

let storageListenerAttached = false

export function initEditScoresTableRowPadding(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return

  const keys = [
    STORAGE_KEYS.assistantEnabled,
    STORAGE_KEYS.editScoresTableCellPaddingVerticalPx,
  ]

  if (!isExtensionContextValid()) return
  try {
    settingsGet(keys, (items) => {
      if (!isExtensionContextValid()) return
      const err = chrome.runtime.lastError
      if (err) {
        console.warn('[Redtooth TD Assistant]', err.message)
        return
      }
      applyFromItems(items as Record<string, unknown>)

      if (!storageListenerAttached) {
        storageListenerAttached = true
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isExtensionContextValid()) return
          whenStorageChangeApplies(area, changes, () => {
            if (
              !isSyncToggleChange(area, changes) &&
              !changes[STORAGE_KEYS.assistantEnabled] &&
              !changes[STORAGE_KEYS.editScoresTableCellPaddingVerticalPx]
            ) {
              return
            }
            try {
              settingsGet(keys, (items2) => {
                if (!isExtensionContextValid()) return
                if (chrome.runtime.lastError) return
                applyFromItems(items2 as Record<string, unknown>)
              })
            } catch {
              /* Extension context invalidated */
            }
          })
        })
      }
    })
  } catch {
    /* Extension context invalidated */
  }
}
