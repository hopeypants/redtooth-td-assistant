import {
  hexToRgba,
  normalizeAddPlayerHighlightHex,
  normalizeAddPlayerHighlightOpacity,
} from '../lib/highlight-color'
import { maxIntFullDigits, minIntFullDigits } from '../lib/membership-bounds'
import {
  isSyncToggleChange,
  settingsGet,
  whenStorageChangeApplies,
} from '../lib/settings-storage'
import { STORAGE_DEFAULTS, STORAGE_KEYS } from '../lib/storage-keys'
import { isExtensionContextValid } from './extension-context'

const ADD_PLAYER_PATH = /\/venue_admin\/addplayerdetails/i
const BTN_ID = 'redtooth-td-assistant-membership-btn'
const HIGHLIGHT_CLASS = 'redtooth-td-assistant-required-highlight'
const STYLE_ID = 'redtooth-td-assistant-required-style'

/** Try these `name` values in order (site may vary slightly). */
const REQUIRED_FIELD_NAMES: string[][] = [
  ['membershipNo'],
  ['forename', 'firstName', 'firstname'],
  ['surname', 'lastName', 'lastname'],
  ['address1', 'addressLine1', 'addr1', 'address_1'],
  ['town', 'city'],
  ['postcode', 'postCode', 'postalCode'],
]

const DEFAULT_VALUE_ADDRESS1_NAMES = REQUIRED_FIELD_NAMES[3]!
const DEFAULT_VALUE_ADDRESS2_NAMES = [
  'address2',
  'addressLine2',
  'addr2',
  'address_2',
]
const DEFAULT_VALUE_TOWN_NAMES = REQUIRED_FIELD_NAMES[4]!
const DEFAULT_VALUE_COUNTY_NAMES = ['county', 'state', 'region']
const DEFAULT_VALUE_POSTCODE_NAMES = REQUIRED_FIELD_NAMES[5]!

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)))
}

function readStoredInt(
  items: Record<string, unknown>,
  key: string,
  def: number,
): number {
  const v = items[key]
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.trunc(v)
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const p = Number.parseInt(v, 10)
    if (Number.isFinite(p)) return p
  }
  return def
}

function randomIntInclusive(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

/** Plain decimal string — no leading-zero padding. */
function formatMembershipValue(n: number): string {
  return String(n)
}

let highlightedEls: HTMLElement[] = []

function readHighlightTintRgba(items: Record<string, unknown>): string {
  const rawHex = items[STORAGE_KEYS.addPlayerHighlightRequiredColor]
  const hex =
    typeof rawHex === 'string'
      ? rawHex
      : STORAGE_DEFAULTS.addPlayerHighlightRequiredColor
  const opacity = normalizeAddPlayerHighlightOpacity(
    items[STORAGE_KEYS.addPlayerHighlightRequiredOpacity],
  )
  return hexToRgba(normalizeAddPlayerHighlightHex(hex), opacity)
}

function setHighlightTintCss(rgba: string): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.append(style)
  }
  style.textContent = `
#myForm .${HIGHLIGHT_CLASS} {
  background-color: ${rgba} !important;
  border-radius: 6px;
}
`
}

function findNamedControl(
  form: HTMLFormElement,
  names: string[],
): HTMLElement | null {
  for (const name of names) {
    const el = form.querySelector<HTMLElement>(
      `input[name="${name}"], textarea[name="${name}"]`,
    )
    if (el) return el
  }
  return null
}

function readStoredString(
  items: Record<string, unknown>,
  key: string,
  def: string,
): string {
  const v = items[key]
  return typeof v === 'string' ? v : def
}

function fillControlIfBlank(el: HTMLElement, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value.trim() !== '') return
    el.value = trimmed
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function applyDefaultFieldValues(items: Record<string, unknown>): void {
  if (items[STORAGE_KEYS.assistantEnabled] === false) return
  if (items[STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled] !== true) return

  const form = document.getElementById('myForm')
  if (!form || !(form instanceof HTMLFormElement)) return

  const address1 = readStoredString(
    items,
    STORAGE_KEYS.addPlayerDefaultAddress1,
    STORAGE_DEFAULTS.addPlayerDefaultAddress1,
  )
  const address2 = readStoredString(
    items,
    STORAGE_KEYS.addPlayerDefaultAddress2,
    STORAGE_DEFAULTS.addPlayerDefaultAddress2,
  )
  const town = readStoredString(
    items,
    STORAGE_KEYS.addPlayerDefaultTown,
    STORAGE_DEFAULTS.addPlayerDefaultTown,
  )
  const county = readStoredString(
    items,
    STORAGE_KEYS.addPlayerDefaultCounty,
    STORAGE_DEFAULTS.addPlayerDefaultCounty,
  )
  const postcode = readStoredString(
    items,
    STORAGE_KEYS.addPlayerDefaultPostcode,
    STORAGE_DEFAULTS.addPlayerDefaultPostcode,
  )

  const elA1 = findNamedControl(form, [...DEFAULT_VALUE_ADDRESS1_NAMES])
  if (elA1) fillControlIfBlank(elA1, address1)
  const elA2 = findNamedControl(form, [...DEFAULT_VALUE_ADDRESS2_NAMES])
  if (elA2) fillControlIfBlank(elA2, address2)
  const elT = findNamedControl(form, [...DEFAULT_VALUE_TOWN_NAMES])
  if (elT) fillControlIfBlank(elT, town)
  const elC = findNamedControl(form, [...DEFAULT_VALUE_COUNTY_NAMES])
  if (elC) fillControlIfBlank(elC, county)
  const elP = findNamedControl(form, [...DEFAULT_VALUE_POSTCODE_NAMES])
  if (elP) fillControlIfBlank(elP, postcode)
}

function clearRequiredFieldHighlights(): void {
  for (const el of highlightedEls) {
    el.classList.remove(HIGHLIGHT_CLASS)
  }
  highlightedEls = []
}

function syncRequiredFieldHighlights(
  enabled: boolean,
  items: Record<string, unknown> = {},
): void {
  clearRequiredFieldHighlights()
  if (!enabled) return

  const form = document.getElementById('myForm')
  if (!form || !(form instanceof HTMLFormElement)) return

  setHighlightTintCss(readHighlightTintRgba(items))
  for (const names of REQUIRED_FIELD_NAMES) {
    const el = findNamedControl(form, names)
    if (el) {
      el.classList.add(HIGHLIGHT_CLASS)
      highlightedEls.push(el)
    }
  }
}

function mountMembershipGenerateButton(items: Record<string, unknown>): void {
  const input = document.querySelector<HTMLInputElement>(
    '#myForm input[name="membershipNo"]',
  )
  if (!input || document.getElementById(BTN_ID)) return

  const digitCount = clampInt(
    readStoredInt(
      items,
      STORAGE_KEYS.addPlayerMembershipDigits,
      STORAGE_DEFAULTS.addPlayerMembershipDigits,
    ),
    1,
    20,
  )

  const lo = minIntFullDigits(digitCount)
  const hi = maxIntFullDigits(digitCount)
  let minV = readStoredInt(
    items,
    STORAGE_KEYS.addPlayerMembershipMinValue,
    STORAGE_DEFAULTS.addPlayerMembershipMinValue,
  )
  let maxV = readStoredInt(
    items,
    STORAGE_KEYS.addPlayerMembershipMaxValue,
    STORAGE_DEFAULTS.addPlayerMembershipMaxValue,
  )
  minV = clampInt(minV, lo, hi)
  maxV = clampInt(maxV, lo, hi)
  const rangeOk = maxV > minV

  const wrap = document.createElement('div')
  wrap.style.cssText = [
    'display:flex',
    'flex-direction:row',
    'flex-wrap:nowrap',
    'align-items:center',
    'gap:8px',
    'margin-top:6px',
    'width:100%',
    'box-sizing:border-box',
  ].join(';')

  input.style.flex = '1 1 auto'
  input.style.minWidth = '0'

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.id = BTN_ID
  btn.className = 'btn'
  btn.style.flexShrink = '0'
  btn.textContent = 'Generate'
  btn.title = rangeOk
    ? `Random integer from ${minV} to ${maxV} (${digitCount}-digit range ${lo}–${hi})`
    : `From/To range is invalid (To must be greater than From). Fix it in the extension settings.`
  btn.style.width = 'auto'
  btn.style.maxWidth = 'none'
  btn.disabled = !rangeOk
  if (!rangeOk) {
    btn.style.opacity = '0.55'
    btn.style.cursor = 'not-allowed'
  }
  if (rangeOk) {
    btn.addEventListener('click', () => {
      const n = randomIntInclusive(minV, maxV)
      input.value = formatMembershipValue(n)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  input.replaceWith(wrap)
  wrap.append(input, btn)
}

let addPlayerStorageListenerAttached = false
let addPlayerSaveHookAttached = false
let lastDefaultFieldItems: Record<string, unknown> = {}

function maybeApplyDefaultsBeforeSaveSubmit(ev: Event): void {
  if (!isExtensionContextValid()) return
  const t = ev.target
  if (!(t instanceof HTMLInputElement || t instanceof HTMLButtonElement)) return
  const type = t.getAttribute('type')?.toLowerCase() ?? ''
  const value = (t.getAttribute('value') ?? t.textContent ?? '').trim().toLowerCase()
  const looksLikeSave = value === 'save' || t.name.toLowerCase() === 'save'
  if (!(type === 'submit' && looksLikeSave)) return
  applyDefaultFieldValues(lastDefaultFieldItems)
}

function ensureAddPlayerSaveHook(): void {
  if (addPlayerSaveHookAttached) return
  const form = document.getElementById('myForm')
  if (!(form instanceof HTMLFormElement)) return
  addPlayerSaveHookAttached = true
  form.addEventListener('click', maybeApplyDefaultsBeforeSaveSubmit, true)
  form.addEventListener('submit', () => {
    applyDefaultFieldValues(lastDefaultFieldItems)
  }, true)
}

function onAddPlayerStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
): void {
  if (!isExtensionContextValid()) return
  whenStorageChangeApplies(area, changes, () => {
    if (
      !isSyncToggleChange(area, changes) &&
      !changes[STORAGE_KEYS.assistantEnabled] &&
      !changes[STORAGE_KEYS.addPlayerHighlightRequiredFields] &&
      !changes[STORAGE_KEYS.addPlayerHighlightRequiredColor] &&
      !changes[STORAGE_KEYS.addPlayerHighlightRequiredOpacity] &&
      !changes[STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled] &&
      !changes[STORAGE_KEYS.addPlayerDefaultAddress1] &&
      !changes[STORAGE_KEYS.addPlayerDefaultAddress2] &&
      !changes[STORAGE_KEYS.addPlayerDefaultTown] &&
      !changes[STORAGE_KEYS.addPlayerDefaultCounty] &&
      !changes[STORAGE_KEYS.addPlayerDefaultPostcode]
    ) {
      return
    }

    try {
      settingsGet(
      [
        STORAGE_KEYS.assistantEnabled,
        STORAGE_KEYS.addPlayerHighlightRequiredFields,
        STORAGE_KEYS.addPlayerHighlightRequiredColor,
        STORAGE_KEYS.addPlayerHighlightRequiredOpacity,
        STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled,
        STORAGE_KEYS.addPlayerDefaultAddress1,
        STORAGE_KEYS.addPlayerDefaultAddress2,
        STORAGE_KEYS.addPlayerDefaultTown,
        STORAGE_KEYS.addPlayerDefaultCounty,
        STORAGE_KEYS.addPlayerDefaultPostcode,
      ],
      (items) => {
        if (!isExtensionContextValid()) return
        const err = chrome.runtime.lastError
        if (err) return
        if (items[STORAGE_KEYS.assistantEnabled] === false) {
          syncRequiredFieldHighlights(false)
          return
        }
        syncRequiredFieldHighlights(
          items[STORAGE_KEYS.addPlayerHighlightRequiredFields] === true,
          items,
        )
        lastDefaultFieldItems = items as Record<string, unknown>
        applyDefaultFieldValues(items)
      },
    )
    } catch {
      /* Extension context invalidated */
    }
  })
}

export function initAddPlayerDetails(): void {
  if (!ADD_PLAYER_PATH.test(window.location.pathname)) return

  if (!document.getElementById('myForm')) return

  const keys = [
    STORAGE_KEYS.assistantEnabled,
    STORAGE_KEYS.addPlayersEnabled,
    STORAGE_KEYS.addPlayerHighlightRequiredFields,
    STORAGE_KEYS.addPlayerHighlightRequiredColor,
    STORAGE_KEYS.addPlayerHighlightRequiredOpacity,
    STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled,
    STORAGE_KEYS.addPlayerDefaultAddress1,
    STORAGE_KEYS.addPlayerDefaultAddress2,
    STORAGE_KEYS.addPlayerDefaultTown,
    STORAGE_KEYS.addPlayerDefaultCounty,
    STORAGE_KEYS.addPlayerDefaultPostcode,
    STORAGE_KEYS.addPlayerMembershipDigits,
    STORAGE_KEYS.addPlayerMembershipMinValue,
    STORAGE_KEYS.addPlayerMembershipMaxValue,
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
      if (items[STORAGE_KEYS.assistantEnabled] === false) return

      if (items[STORAGE_KEYS.addPlayersEnabled] !== false) {
        mountMembershipGenerateButton(items)
      }

      syncRequiredFieldHighlights(
        items[STORAGE_KEYS.addPlayerHighlightRequiredFields] === true,
        items,
      )

      lastDefaultFieldItems = items as Record<string, unknown>
      applyDefaultFieldValues(items)
      ensureAddPlayerSaveHook()

      if (!addPlayerStorageListenerAttached) {
        addPlayerStorageListenerAttached = true
        chrome.storage.onChanged.addListener(onAddPlayerStorageChanged)
      }
    })
  } catch {
    /* Extension context invalidated */
  }
}
