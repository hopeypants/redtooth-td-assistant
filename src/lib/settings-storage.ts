/**
 * Settings live in `chrome.storage.sync` when sync is on (Chrome profile / Google sync),
 * or in `chrome.storage.local` when off. The choice is stored only in local:
 * `syncSettingsAcrossBrowsers` — default true (sync) for backward compatibility.
 */
import { STORAGE_KEYS } from './storage-keys'

export const STORAGE_KEY_SYNC_SETTINGS_ENABLED = 'syncSettingsAcrossBrowsers' as const

export const ALL_DATA_KEYS = Object.values(STORAGE_KEYS) as string[]

export function isSyncSettingsEnabled(cb: (enabled: boolean) => void): void {
  try {
    chrome.storage.local.get([STORAGE_KEY_SYNC_SETTINGS_ENABLED], (r) => {
      const err = chrome.runtime.lastError
      if (err) {
        cb(true)
        return
      }
      cb(r[STORAGE_KEY_SYNC_SETTINGS_ENABLED] !== false)
    })
  } catch {
    cb(true)
  }
}

export function settingsGet(
  keys: string[],
  cb: (items: Record<string, unknown>) => void,
): void {
  isSyncSettingsEnabled((useSync) => {
    const area = useSync ? chrome.storage.sync : chrome.storage.local
    try {
      area.get(keys, cb)
    } catch {
      /* invalid extension context */
    }
  })
}

export function settingsSet(
  patch: Record<string, unknown>,
  cb?: () => void,
): void {
  isSyncSettingsEnabled((useSync) => {
    const area = useSync ? chrome.storage.sync : chrome.storage.local
    try {
      if (cb) {
        area.set(patch, cb)
      } else {
        area.set(patch)
      }
    } catch {
      /* invalid extension context */
    }
  })
}

export function settingsClearData(cb: (err?: string) => void): void {
  isSyncSettingsEnabled((useSync) => {
    if (useSync) {
      try {
        chrome.storage.sync.clear(() => cb(chrome.runtime.lastError?.message))
      } catch {
        cb(undefined)
      }
    } else {
      try {
        chrome.storage.local.remove(ALL_DATA_KEYS, () =>
          cb(chrome.runtime.lastError?.message),
        )
      } catch {
        cb(undefined)
      }
    }
  })
}

/**
 * Turn sync on: merge local + sync (local wins per key), write to sync, then set local flag true.
 * Turn sync off: copy all data keys from sync into local and set local flag false.
 */
export function setSyncSettingsEnabled(
  enabled: boolean,
  onDone: (err?: string) => void,
): void {
  if (enabled) {
    chrome.storage.sync.get(ALL_DATA_KEYS, (syncItems) => {
      if (chrome.runtime.lastError) {
        onDone(chrome.runtime.lastError.message)
        return
      }
      chrome.storage.local.get(ALL_DATA_KEYS, (localItems) => {
        if (chrome.runtime.lastError) {
          onDone(chrome.runtime.lastError.message)
          return
        }
        const merged = {
          ...(syncItems as Record<string, unknown>),
          ...(localItems as Record<string, unknown>),
        }
        chrome.storage.sync.set(merged, () => {
          if (chrome.runtime.lastError) {
            onDone(chrome.runtime.lastError.message)
            return
          }
          chrome.storage.local.set(
            { [STORAGE_KEY_SYNC_SETTINGS_ENABLED]: true },
            () => onDone(chrome.runtime.lastError?.message),
          )
        })
      })
    })
  } else {
    chrome.storage.sync.get(ALL_DATA_KEYS, (syncItems) => {
      if (chrome.runtime.lastError) {
        onDone(chrome.runtime.lastError.message)
        return
      }
      chrome.storage.local.set(
        {
          ...(syncItems as Record<string, unknown>),
          [STORAGE_KEY_SYNC_SETTINGS_ENABLED]: false,
        },
        () => onDone(chrome.runtime.lastError?.message),
      )
    })
  }
}

/** True when the user toggled sync vs local storage (always `local` area). */
export function isSyncToggleChange(
  area: string,
  changes: Record<string, chrome.storage.StorageChange | undefined>,
): boolean {
  return (
    area === 'local' &&
    Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY_SYNC_SETTINGS_ENABLED)
  )
}

/** Whether a storage event applies to the current settings area (or is the sync toggle). */
export function whenStorageChangeApplies(
  area: string,
  changes: Record<string, chrome.storage.StorageChange | undefined>,
  callback: () => void,
): void {
  isSyncSettingsEnabled((useSync) => {
    if (area === 'local' && changes[STORAGE_KEY_SYNC_SETTINGS_ENABLED]) {
      callback()
      return
    }
    const want = useSync ? 'sync' : 'local'
    if (area !== want) return
    callback()
  })
}
