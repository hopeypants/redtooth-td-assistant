import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import {
  STORAGE_DEFAULTS,
  STORAGE_KEYS,
  type LoginPageTarget,
} from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'

const LOGIN_CHOOSER_PATH_RE = /^\/login\/?$/i
const VENUE_LOGIN_PATH_RE = /^\/venue_admin\/login\/?$/i
const TD_LOGIN_PATH_RE = /^\/venue_admin\/loginTournamentDirector\/?$/i
const PLAYER_LOGIN_PATH_RE = /^\/player\/login\/?$/i

const RETRY_KEY_PREFIX = 'rta-login-auto-submit-attempted:'

const STORAGE_KEYS_LOGIN = [
  STORAGE_KEYS.assistantEnabled,
  STORAGE_KEYS.loginPageEnabled,
  STORAGE_KEYS.loginPageTarget,
  STORAGE_KEYS.loginPageUsername,
  STORAGE_KEYS.loginPagePassword,
  STORAGE_KEYS.loginPageVenueUsername,
  STORAGE_KEYS.loginPageVenuePassword,
  STORAGE_KEYS.loginPageTdUsername,
  STORAGE_KEYS.loginPageTdPassword,
  STORAGE_KEYS.loginPagePlayerUsername,
  STORAGE_KEYS.loginPagePlayerPassword,
] as const

let storageListenerAttached = false

function normalizeLoginPageTarget(raw: unknown): LoginPageTarget {
  if (raw === 'venue' || raw === 'td' || raw === 'player') return raw
  return STORAGE_DEFAULTS.loginPageTarget
}

function desiredLoginPath(target: LoginPageTarget): string {
  if (target === 'td') return '/venue_admin/loginTournamentDirector'
  if (target === 'player') return '/player/login'
  return '/venue_admin/login'
}

function pathMatchesTarget(path: string, target: LoginPageTarget): boolean {
  if (target === 'td') return TD_LOGIN_PATH_RE.test(path)
  if (target === 'player') return PLAYER_LOGIN_PATH_RE.test(path)
  return VENUE_LOGIN_PATH_RE.test(path)
}

function setControlValue(el: HTMLInputElement, value: string): void {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function formHasVisibleError(form: HTMLFormElement): boolean {
  const err = form.querySelector('.error-message')
  return (err?.textContent ?? '').trim() !== ''
}

function applyLoginFormFillAndSubmit(
  target: LoginPageTarget,
  username: string,
  password: string,
): void {
  const path = window.location.pathname
  if (!pathMatchesTarget(path, target)) return
  if (!username.trim() || !password.trim()) return

  const form = document.querySelector<HTMLFormElement>('form')
  if (!form) return

  const markerKey = `${RETRY_KEY_PREFIX}${target}`
  const alreadyAttempted = sessionStorage.getItem(markerKey) === '1'
  if (alreadyAttempted && formHasVisibleError(form)) return

  const usernameName =
    target === 'venue'
      ? 'venue_username'
      : target === 'td'
        ? 'username'
        : 'player_username'
  const passwordName =
    target === 'venue'
      ? 'venue_password'
      : target === 'td'
        ? 'password'
        : 'player_password'

  const userEl = form.querySelector<HTMLInputElement>(`input[name="${usernameName}"]`)
  const passEl = form.querySelector<HTMLInputElement>(`input[name="${passwordName}"]`)
  if (!userEl || !passEl) return

  setControlValue(userEl, username)
  setControlValue(passEl, password)

  const submitEl =
    form.querySelector<HTMLInputElement>('input[type="submit"][value="Login"]') ??
    form.querySelector<HTMLInputElement>('input[type="submit"]')
  if (!submitEl) return

  sessionStorage.setItem(markerKey, '1')
  window.setTimeout(() => {
    if (!isExtensionContextValid()) return
    submitEl.click()
  }, 60)
}

function applyLoginBehavior(items: Record<string, unknown>): void {
  if (!isExtensionContextValid()) return
  if (items[STORAGE_KEYS.assistantEnabled] === false) return
  const enabled =
    typeof items[STORAGE_KEYS.loginPageEnabled] === 'boolean'
      ? (items[STORAGE_KEYS.loginPageEnabled] as boolean)
      : STORAGE_DEFAULTS.loginPageEnabled
  if (!enabled) return

  const target = normalizeLoginPageTarget(items[STORAGE_KEYS.loginPageTarget])
  const legacyUsername =
    typeof items[STORAGE_KEYS.loginPageUsername] === 'string'
      ? (items[STORAGE_KEYS.loginPageUsername] as string)
      : STORAGE_DEFAULTS.loginPageUsername
  const legacyPassword =
    typeof items[STORAGE_KEYS.loginPagePassword] === 'string'
      ? (items[STORAGE_KEYS.loginPagePassword] as string)
      : STORAGE_DEFAULTS.loginPagePassword
  const readCredential = (key: string, fallback: string): string => {
    const v = items[key]
    return typeof v === 'string' && v.trim() !== '' ? v : fallback
  }
  const username =
    target === 'venue'
      ? readCredential(STORAGE_KEYS.loginPageVenueUsername, legacyUsername)
      : target === 'td'
        ? readCredential(STORAGE_KEYS.loginPageTdUsername, legacyUsername)
        : readCredential(STORAGE_KEYS.loginPagePlayerUsername, legacyUsername)
  const password =
    target === 'venue'
      ? readCredential(STORAGE_KEYS.loginPageVenuePassword, legacyPassword)
      : target === 'td'
        ? readCredential(STORAGE_KEYS.loginPageTdPassword, legacyPassword)
        : readCredential(STORAGE_KEYS.loginPagePlayerPassword, legacyPassword)

  if (LOGIN_CHOOSER_PATH_RE.test(window.location.pathname)) {
    const targetUrl = new URL(desiredLoginPath(target), window.location.origin).toString()
    if (window.location.href !== targetUrl) {
      window.location.replace(targetUrl)
      return
    }
  }

  applyLoginFormFillAndSubmit(target, username, password)
}

export function initRedtoothLoginPageHelper(): void {
  const path = window.location.pathname
  if (
    !LOGIN_CHOOSER_PATH_RE.test(path) &&
    !VENUE_LOGIN_PATH_RE.test(path) &&
    !TD_LOGIN_PATH_RE.test(path) &&
    !PLAYER_LOGIN_PATH_RE.test(path)
  ) {
    return
  }

  if (!isExtensionContextValid()) return
  try {
    settingsGet([...STORAGE_KEYS_LOGIN], (items) => {
      if (!isExtensionContextValid()) return
      if (chrome.runtime.lastError) return
      applyLoginBehavior(items as Record<string, unknown>)
    })
  } catch {
    /* Extension context invalidated */
  }

  if (!storageListenerAttached) {
    storageListenerAttached = true
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!isExtensionContextValid()) return
      whenStorageChangeApplies(area, changes, () => {
        if (
          !isSyncToggleChange(area, changes) &&
          !changes[STORAGE_KEYS.assistantEnabled] &&
          !changes[STORAGE_KEYS.loginPageEnabled] &&
          !changes[STORAGE_KEYS.loginPageTarget] &&
          !changes[STORAGE_KEYS.loginPageUsername] &&
          !changes[STORAGE_KEYS.loginPagePassword] &&
          !changes[STORAGE_KEYS.loginPageVenueUsername] &&
          !changes[STORAGE_KEYS.loginPageVenuePassword] &&
          !changes[STORAGE_KEYS.loginPageTdUsername] &&
          !changes[STORAGE_KEYS.loginPageTdPassword] &&
          !changes[STORAGE_KEYS.loginPagePlayerUsername] &&
          !changes[STORAGE_KEYS.loginPagePlayerPassword]
        ) {
          return
        }
        try {
          settingsGet([...STORAGE_KEYS_LOGIN], (items) => {
            if (!isExtensionContextValid()) return
            if (chrome.runtime.lastError) return
            applyLoginBehavior(items as Record<string, unknown>)
          })
        } catch {
          /* Extension context invalidated */
        }
      })
    })
  }
}

if (document.body) {
  initRedtoothLoginPageHelper()
} else {
  document.addEventListener('DOMContentLoaded', initRedtoothLoginPageHelper, {
    once: true,
  })
}
