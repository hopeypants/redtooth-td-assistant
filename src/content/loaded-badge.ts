import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'
import { EDIT_SCORES_PATH_RE } from './floating-update-button'

const ROOT_ID = 'redtooth-td-assistant-root'

const BADGE_KEYS = [
  STORAGE_KEYS.assistantEnabled,
  STORAGE_KEYS.showLoadedBadge,
  STORAGE_KEYS.editScoresFloatingUpdateEnabled,
  STORAGE_KEYS.editScoresFloatingUpdatePosition,
] as const

let loadedBadgeListenerAttached = false
/** Revoked when the badge is removed — blob URL so the icon loads on the host page. */
let badgeIconObjectUrl: string | null = null

function normalizeFloatingUpdatePosition(input: unknown): 'left' | 'right' {
  if (input === 'left' || input === 'right') return input
  return STORAGE_DEFAULTS.editScoresFloatingUpdatePosition
}

/**
 * Bottom-left by default; if the floating Update button is on the left on Edit Scores,
 * use bottom-right so the two controls do not overlap.
 */
function badgeCornerFromItems(items: Record<string, unknown>): 'bl' | 'br' {
  const floatOn =
    typeof items[STORAGE_KEYS.editScoresFloatingUpdateEnabled] === 'boolean'
      ? items[STORAGE_KEYS.editScoresFloatingUpdateEnabled]
      : STORAGE_DEFAULTS.editScoresFloatingUpdateEnabled
  const side = normalizeFloatingUpdatePosition(
    items[STORAGE_KEYS.editScoresFloatingUpdatePosition],
  )
  if (
    EDIT_SCORES_PATH_RE.test(window.location.pathname) &&
    floatOn &&
    side === 'left'
  ) {
    return 'br'
  }
  return 'bl'
}

function applyHostInset(host: HTMLElement, corner: 'bl' | 'br'): void {
  host.style.top = 'auto'
  host.style.bottom = '25px'
  if (corner === 'bl') {
    host.style.left = '25px'
    host.style.right = 'auto'
  } else {
    host.style.right = '25px'
    host.style.left = 'auto'
  }
}

function mountBadge(corner: 'bl' | 'br'): void {
  if (document.getElementById(ROOT_ID)) return

  const host = document.createElement('div')
  host.id = ROOT_ID
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;'
  applyHostInset(host, corner)

  const shadow = host.attachShadow({ mode: 'open' })

  const panel = document.createElement('div')
  panel.style.cssText = [
    'all:initial',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'padding:8px 12px',
    'background:#1a1a2e',
    'color:#eee',
    'border-radius:8px',
    'font:12px/1.4 system-ui,sans-serif',
    'box-shadow:0 4px 12px rgba(0,0,0,.25)',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = 'Redtooth TD Assistant loaded'

  const icon = document.createElement('img')
  icon.alt = ''
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('data-rta-badge-icon', '')
  icon.style.cssText = [
    'display:block',
    'width:22px',
    'height:22px',
    'flex-shrink:0',
    'border-radius:4px',
    'object-fit:contain',
  ].join(';')

  const iconSrc = chrome.runtime.getURL('icons/icon32.png')
  /**
   * Direct `chrome-extension://…` img src often fails on the page without
   * web_accessible_resources; fetch in the extension context + blob URL is reliable.
   */
  fetch(iconSrc)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.blob()
    })
    .then((blob) => {
      if (badgeIconObjectUrl) URL.revokeObjectURL(badgeIconObjectUrl)
      badgeIconObjectUrl = URL.createObjectURL(blob)
      icon.src = badgeIconObjectUrl
    })
    .catch(() => {
      icon.src = iconSrc
    })

  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = '×'
  close.title = 'Dismiss'
  close.style.cssText = [
    'all:initial',
    'cursor:pointer',
    'font-size:16px',
    'line-height:1',
    'padding:0 4px',
    'color:#aaa',
  ].join(';')
  close.addEventListener('click', () => host.remove())

  panel.append(icon, label, close)
  shadow.append(panel)
  document.body.appendChild(host)
}

function removeBadge(): void {
  if (badgeIconObjectUrl) {
    URL.revokeObjectURL(badgeIconObjectUrl)
    badgeIconObjectUrl = null
  }
  document.getElementById(ROOT_ID)?.remove()
}

function updateBadgePosition(host: HTMLElement, corner: 'bl' | 'br'): void {
  applyHostInset(host, corner)
}

export function applyLoadedBadgeFromItems(items: Record<string, unknown>): void {
  const assistantOn =
    typeof items[STORAGE_KEYS.assistantEnabled] === 'boolean'
      ? items[STORAGE_KEYS.assistantEnabled]
      : STORAGE_DEFAULTS.assistantEnabled
  const show =
    typeof items[STORAGE_KEYS.showLoadedBadge] === 'boolean'
      ? items[STORAGE_KEYS.showLoadedBadge]
      : STORAGE_DEFAULTS.showLoadedBadge

  if (!assistantOn || !show) {
    removeBadge()
    return
  }

  const corner = badgeCornerFromItems(items)
  const existing = document.getElementById(ROOT_ID)
  if (existing) {
    updateBadgePosition(existing, corner)
    return
  }
  mountBadge(corner)
}

export function initLoadedBadge(): void {
  if (!isExtensionContextValid()) return
  try {
    settingsGet([...BADGE_KEYS], (items) => {
      if (!isExtensionContextValid()) return
      const err = chrome.runtime.lastError
      if (err) {
        console.warn('[Redtooth TD Assistant]', err.message)
        applyLoadedBadgeFromItems({} as Record<string, unknown>)
        return
      }
      applyLoadedBadgeFromItems(items as Record<string, unknown>)

      if (!loadedBadgeListenerAttached) {
        loadedBadgeListenerAttached = true
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isExtensionContextValid()) return
          whenStorageChangeApplies(area, changes, () => {
            if (
              !isSyncToggleChange(area, changes) &&
              !changes[STORAGE_KEYS.assistantEnabled] &&
              !changes[STORAGE_KEYS.showLoadedBadge] &&
              !changes[STORAGE_KEYS.editScoresFloatingUpdateEnabled] &&
              !changes[STORAGE_KEYS.editScoresFloatingUpdatePosition]
            ) {
              return
            }
            try {
              settingsGet([...BADGE_KEYS], (items2) => {
                if (!isExtensionContextValid()) return
                if (chrome.runtime.lastError) return
                applyLoadedBadgeFromItems(items2 as Record<string, unknown>)
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
