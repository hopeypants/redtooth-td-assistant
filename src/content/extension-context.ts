/**
 * After an extension reload or update, content scripts can keep running but
 * `chrome.*` APIs throw "Extension context invalidated".
 */
export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && chrome.runtime.id !== undefined
  } catch {
    return false
  }
}
