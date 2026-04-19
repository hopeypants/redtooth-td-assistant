import type { SettingsUiThemePreference } from '../lib/storage-keys'

export function parseThemePref(raw: unknown): SettingsUiThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

export function effectiveTheme(pref: SettingsUiThemePreference): 'light' | 'dark' {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyDocumentTheme(effective: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = effective
}

let systemChangeHandler: (() => void) | null = null

export function syncSystemThemeListener(
  pref: SettingsUiThemePreference,
  onSystemChange: () => void,
): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  if (systemChangeHandler) {
    mq.removeEventListener('change', systemChangeHandler)
    systemChangeHandler = null
  }
  if (pref !== 'system') return
  systemChangeHandler = () => {
    onSystemChange()
  }
  mq.addEventListener('change', systemChangeHandler)
}
