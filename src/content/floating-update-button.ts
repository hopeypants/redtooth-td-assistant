import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'

export const EDIT_SCORES_PATH_RE = /^\/venue_admin\/editscores\/(\d+)\/?$/
const FLOAT_WRAP_ID = 'redtooth-td-assistant-floating-update'

type HorizontalSide = 'left' | 'right'

let floatingUpdateStorageListenerAttached = false
let floatingUpdateScrollVisibilityAttached = false

/** Same resolution order as `triggerPageUpdate` — the in-page Update control below the table. */
function resolveNativeUpdateButton(): HTMLElement | null {
  const byId = document.getElementById('btnUpdate')
  if (byId) return byId
  const byName = document.querySelector<HTMLElement>(
    'input[name="btnUpdate"][type="button"]',
  )
  if (byName) return byName
  const byValue = document.querySelector<HTMLElement>(
    'input.btn[type="button"][value="Update"]',
  )
  return byValue
}

/** True when the native Update button exists and intersects the visible viewport. */
function isNativeUpdateInViewport(): boolean {
  const el = resolveNativeUpdateButton()
  if (!el || !el.isConnected) return false
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  const vw = window.innerWidth
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw
}

function syncFloatingUpdateScrollVisibility(): void {
  const wrap = document.getElementById(FLOAT_WRAP_ID)
  if (!wrap) return
  const hide = isNativeUpdateInViewport()
  wrap.style.visibility = hide ? 'hidden' : ''
  wrap.style.pointerEvents = hide ? 'none' : ''
}

function ensureFloatingUpdateScrollVisibilityListener(): void {
  if (floatingUpdateScrollVisibilityAttached) return
  floatingUpdateScrollVisibilityAttached = true
  const onScrollOrResize = (): void => {
    syncFloatingUpdateScrollVisibility()
  }
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)
}

function normalizeFloatingUpdatePosition(input: unknown): HorizontalSide {
  if (input === 'left' || input === 'right') return input
  return STORAGE_DEFAULTS.editScoresFloatingUpdatePosition
}

function applyFloatingWrapInset(wrap: HTMLElement, side: HorizontalSide): void {
  wrap.style.bottom = '25px'
  wrap.style.top = ''
  if (side === 'left') {
    wrap.style.left = '25px'
    wrap.style.right = 'auto'
  } else {
    wrap.style.right = '25px'
    wrap.style.left = 'auto'
  }
}

function triggerPageUpdate(): void {
  const native = resolveNativeUpdateButton()
  if (native) native.click()
}

function mountFloatingUpdate(side: HorizontalSide): void {
  if (document.getElementById(FLOAT_WRAP_ID)) return

  const wrap = document.createElement('div')
  wrap.id = FLOAT_WRAP_ID
  wrap.style.cssText =
    'position:fixed;z-index:2147483646;pointer-events:auto;'
  applyFloatingWrapInset(wrap, side)

  const btn = document.createElement('input')
  btn.type = 'button'
  /** Avoid duplicate id `btnUpdate` if the page already has one. */
  btn.id = 'redtooth-td-assistant-floating-btnUpdate'
  btn.name = 'btnUpdate'
  btn.className = 'btn'
  btn.value = 'Update'
  btn.setAttribute('title', 'Update scores')
  btn.style.width = '200px'
  btn.addEventListener('click', () => {
    triggerPageUpdate()
  })

  wrap.appendChild(btn)
  document.body.appendChild(wrap)
  ensureFloatingUpdateScrollVisibilityListener()
  syncFloatingUpdateScrollVisibility()
  requestAnimationFrame(() => syncFloatingUpdateScrollVisibility())
}

function removeFloatingUpdate(): void {
  document.getElementById(FLOAT_WRAP_ID)?.remove()
}

function applyFloatingUpdateFromItems(items: Record<string, unknown>): void {
  removeFloatingUpdate()
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return
  if (items[STORAGE_KEYS.assistantEnabled] === false) return
  const en = items[STORAGE_KEYS.editScoresFloatingUpdateEnabled]
  const on =
    typeof en === 'boolean' ? en : STORAGE_DEFAULTS.editScoresFloatingUpdateEnabled
  if (!on) return
  const side = normalizeFloatingUpdatePosition(
    items[STORAGE_KEYS.editScoresFloatingUpdatePosition],
  )
  mountFloatingUpdate(side)
}

export function initFloatingUpdateButton(): void {
  if (!EDIT_SCORES_PATH_RE.test(window.location.pathname)) return

  const keys = [
    STORAGE_KEYS.assistantEnabled,
    STORAGE_KEYS.editScoresFloatingUpdateEnabled,
    STORAGE_KEYS.editScoresFloatingUpdatePosition,
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
      applyFloatingUpdateFromItems(items as Record<string, unknown>)

      if (!floatingUpdateStorageListenerAttached) {
        floatingUpdateStorageListenerAttached = true
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isExtensionContextValid()) return
          whenStorageChangeApplies(area, changes, () => {
            if (
              !isSyncToggleChange(area, changes) &&
              !changes[STORAGE_KEYS.assistantEnabled] &&
              !changes[STORAGE_KEYS.editScoresFloatingUpdateEnabled] &&
              !changes[STORAGE_KEYS.editScoresFloatingUpdatePosition]
            ) {
              return
            }
            try {
              settingsGet(keys, (items2) => {
                if (!isExtensionContextValid()) return
                if (chrome.runtime.lastError) return
                applyFloatingUpdateFromItems(items2 as Record<string, unknown>)
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
