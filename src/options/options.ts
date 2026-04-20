import { maxIntFullDigits, minIntFullDigits } from '../lib/membership-bounds'
import {
  normalizeAddPlayerHighlightHex,
  normalizeAddPlayerHighlightOpacity,
} from '../lib/highlight-color'
import {
  getDefaultSettingsSnapshot,
  STORAGE_DEFAULTS,
  STORAGE_KEYS,
  type EditScoresDuplicateRankBehavior,
  type SettingsUiThemePreference,
} from '../lib/storage-keys'
import {
  settingsClearData,
  settingsGet,
  settingsSet,
  setSyncSettingsEnabled,
  STORAGE_KEY_SYNC_SETTINGS_ENABLED,
} from '../lib/settings-storage'
import {
  coerceWeekCommencingDateFormatId,
  getListSeasonScoreWeeksFormatExampleIsoYmd,
  getWeekCommencingFormatOptionLabel,
  isWeekCommencingDateFormatId,
  type WeekCommencingDateFormatId,
  WEEK_COMMENCING_DATE_FORMAT_IDS,
} from '../lib/week-commencing-date-format'
import {
  applyDocumentTheme,
  effectiveTheme,
  parseThemePref,
  syncSystemThemeListener,
} from './ui-theme'

const statusEl = document.querySelector<HTMLParagraphElement>('#save-status')
const generalResetStatusBannerEl = document.querySelector<HTMLDivElement>(
  '#general-reset-status-banner',
)
const generalResetStatusTextEl = document.querySelector<HTMLParagraphElement>(
  '#general-reset-status-text',
)
const generalResetStatusDismissBtn =
  document.querySelector<HTMLButtonElement>('#general-reset-status-dismiss')
const assistantCb = document.querySelector<HTMLInputElement>('#assistant-enabled')
const assistantAboutCb = document.querySelector<HTMLInputElement>(
  '#assistant-enabled-about',
)
const editNavCb = document.querySelector<HTMLInputElement>('#edit-scores-nav-enabled')
const prevNextCb = document.querySelector<HTMLInputElement>('#edit-scores-prev-next')
const jumpCb = document.querySelector<HTMLInputElement>('#edit-scores-jump')
const pastIn = document.querySelector<HTMLInputElement>('#edit-scores-past')
const futureIn = document.querySelector<HTMLInputElement>('#edit-scores-future')
const editScoresFloatingUpdateCb = document.querySelector<HTMLInputElement>(
  '#edit-scores-floating-update-enabled',
)
const editScoresFloatingUpdatePositionSelect =
  document.querySelector<HTMLSelectElement>('#edit-scores-floating-update-position')
const editScoresFloatingUpdateSubEl = document.querySelector<HTMLDivElement>(
  '#edit-scores-floating-update-subsettings',
)
const listSeasonScoreWeeksDateFormatEnabledCb =
  document.querySelector<HTMLInputElement>(
    '#list-season-score-weeks-date-format-enabled',
  )
const listSeasonScoreWeeksFormatSubEl = document.querySelector<HTMLDivElement>(
  '#list-season-score-weeks-format-subsettings',
)
const listSeasonScoreWeeksDateFormatSelect =
  document.querySelector<HTMLSelectElement>('#list-season-score-weeks-date-format')
const listSeasonScoreWeeksVenuePlayDayEnabledCb =
  document.querySelector<HTMLInputElement>(
    '#list-season-score-weeks-venue-play-day-enabled',
  )
const listSeasonScoreWeeksPlayDaySubEl = document.querySelector<HTMLDivElement>(
  '#list-season-score-weeks-play-day-subsettings',
)
const listSeasonScoreWeeksPlayDayOfWeekSelect =
  document.querySelector<HTMLSelectElement>('#list-season-score-weeks-play-day-of-week')
const editScoresTablePaddingVIn = document.querySelector<HTMLInputElement>(
  '#edit-scores-table-padding-v',
)
const editScoresTableSpacingResetBtn = document.querySelector<HTMLButtonElement>(
  '#edit-scores-table-spacing-reset',
)
const editScoresDuplicateRankBehaviorSelect =
  document.querySelector<HTMLSelectElement>('#edit-scores-duplicate-rank-behavior')
const editScoresPlayerArchiveCb = document.querySelector<HTMLInputElement>(
  '#edit-scores-player-archive-enabled',
)
const editScoresPlayerNameFilterCb = document.querySelector<HTMLInputElement>(
  '#edit-scores-player-name-filter-enabled',
)
const playerNameFilterSubEl = document.querySelector<HTMLDivElement>(
  '#player-name-filter-subsettings',
)
const editScoresPlayerNameFilterCtrlFCb = document.querySelector<HTMLInputElement>(
  '#edit-scores-player-name-filter-ctrl-f',
)
const editScoresPlayerNameFilterEscClearsCb =
  document.querySelector<HTMLInputElement>(
    '#edit-scores-player-name-filter-esc-clears',
  )
const editScoresPlayerNameFilterIncludeArchivedCb =
  document.querySelector<HTMLInputElement>(
    '#edit-scores-player-name-filter-include-archived',
  )
const nameFilterIncludeArchivedRowEl = document.querySelector<HTMLDivElement>(
  '#player-name-filter-include-archived-row',
)
const showLoadedBadgeCb =
  document.querySelector<HTMLInputElement>('#show-loaded-badge')
const headerBuyMeACoffeeWrapEl = document.querySelector<HTMLSpanElement>(
  '#header-buy-me-a-coffee-wrap',
)
const showBuyMeACoffeeHeaderCb = document.querySelector<HTMLInputElement>(
  '#show-buy-me-a-coffee-header',
)
const syncSettingsCb =
  document.querySelector<HTMLInputElement>('#sync-settings-enabled')
const addPlayersCb = document.querySelector<HTMLInputElement>('#add-players-enabled')
const addPlayerHighlightRequiredCb =
  document.querySelector<HTMLInputElement>('#add-player-highlight-required')
const addPlayerDigitsIn = document.querySelector<HTMLInputElement>('#add-player-digits')
const addPlayerMinIn = document.querySelector<HTMLInputElement>('#add-player-min-value')
const addPlayerMaxIn = document.querySelector<HTMLInputElement>('#add-player-max-value')
const subsettingsEl = document.querySelector<HTMLDivElement>(
  '#edit-scores-subsettings',
)
const seasonCountSubEl = document.querySelector<HTMLDivElement>(
  '#edit-scores-season-count-subsettings',
)
const addPlayersSubEl = document.querySelector<HTMLDivElement>('#add-players-subsettings')
const addPlayerHighlightSubEl = document.querySelector<HTMLDivElement>(
  '#add-player-highlight-subsettings',
)
const addPlayerHighlightColorIn =
  document.querySelector<HTMLInputElement>('#add-player-highlight-color')
const addPlayerHighlightOpacityIn = document.querySelector<HTMLInputElement>(
  '#add-player-highlight-opacity',
)
const addPlayerHighlightOpacityValueSpanEl = document.querySelector<HTMLSpanElement>(
  '#add-player-highlight-opacity-value',
)
const addPlayerDefaultFieldValuesEnabledCb =
  document.querySelector<HTMLInputElement>('#add-player-default-field-values-enabled')
const addPlayerDefaultFieldValuesSubEl = document.querySelector<HTMLDivElement>(
  '#add-player-default-field-values-subsettings',
)
const addPlayerDefaultAddress1In = document.querySelector<HTMLInputElement>(
  '#add-player-default-address1',
)
const addPlayerDefaultAddress2In = document.querySelector<HTMLInputElement>(
  '#add-player-default-address2',
)
const addPlayerDefaultTownIn =
  document.querySelector<HTMLInputElement>('#add-player-default-town')
const addPlayerDefaultCountyIn = document.querySelector<HTMLInputElement>(
  '#add-player-default-county',
)
const addPlayerDefaultPostcodeIn = document.querySelector<HTMLInputElement>(
  '#add-player-default-postcode',
)
const membershipRefreshNoteEl =
  document.querySelector<HTMLParagraphElement>('#membership-refresh-note')
const membershipRangeWarningEl =
  document.querySelector<HTMLParagraphElement>('#membership-range-warning')
const tabListEl = document.querySelector<HTMLDivElement>('[role="tablist"]')
const themeLightBtn = document.querySelector<HTMLButtonElement>('#theme-light')
const themeSystemBtn = document.querySelector<HTMLButtonElement>('#theme-system')
const themeDarkBtn = document.querySelector<HTMLButtonElement>('#theme-dark')
const resetAllSettingsBtn =
  document.querySelector<HTMLButtonElement>('#reset-all-settings')
const resetAllSettingsConfirmSubEl = document.querySelector<HTMLDivElement>(
  '#reset-all-settings-confirm-subsettings',
)
const resetAllSettingsAckInput = document.querySelector<HTMLInputElement>(
  '#reset-all-settings-ack',
)
const resetAllSettingsIncludeArchiveInput =
  document.querySelector<HTMLInputElement>(
    '#reset-all-settings-include-archive',
  )
const resetAllSettingsCancelBtn =
  document.querySelector<HTMLButtonElement>('#reset-all-settings-cancel')
const resetAllSettingsConfirmBtn =
  document.querySelector<HTMLButtonElement>('#reset-all-settings-confirm')

if (
  !statusEl ||
  !assistantCb ||
  !assistantAboutCb ||
  !editNavCb ||
  !prevNextCb ||
  !jumpCb ||
  !pastIn ||
  !futureIn ||
  !editScoresFloatingUpdateCb ||
  !editScoresFloatingUpdatePositionSelect ||
  !editScoresFloatingUpdateSubEl ||
  !listSeasonScoreWeeksDateFormatEnabledCb ||
  !listSeasonScoreWeeksFormatSubEl ||
  !listSeasonScoreWeeksDateFormatSelect ||
  !listSeasonScoreWeeksVenuePlayDayEnabledCb ||
  !listSeasonScoreWeeksPlayDaySubEl ||
  !listSeasonScoreWeeksPlayDayOfWeekSelect ||
  !editScoresTablePaddingVIn ||
  !editScoresDuplicateRankBehaviorSelect ||
  !editScoresPlayerArchiveCb ||
  !editScoresPlayerNameFilterCb ||
  !playerNameFilterSubEl ||
  !editScoresPlayerNameFilterCtrlFCb ||
  !editScoresPlayerNameFilterEscClearsCb ||
  !editScoresPlayerNameFilterIncludeArchivedCb ||
  !nameFilterIncludeArchivedRowEl ||
  !showLoadedBadgeCb ||
  !headerBuyMeACoffeeWrapEl ||
  !showBuyMeACoffeeHeaderCb ||
  !syncSettingsCb ||
  !addPlayersCb ||
  !addPlayerHighlightRequiredCb ||
  !addPlayerDigitsIn ||
  !addPlayerMinIn ||
  !addPlayerMaxIn ||
  !subsettingsEl ||
  !seasonCountSubEl ||
  !addPlayersSubEl ||
  !addPlayerHighlightSubEl ||
  !addPlayerHighlightColorIn ||
  !addPlayerHighlightOpacityIn ||
  !addPlayerHighlightOpacityValueSpanEl ||
  !addPlayerDefaultFieldValuesEnabledCb ||
  !addPlayerDefaultFieldValuesSubEl ||
  !addPlayerDefaultAddress1In ||
  !addPlayerDefaultAddress2In ||
  !addPlayerDefaultTownIn ||
  !addPlayerDefaultCountyIn ||
  !addPlayerDefaultPostcodeIn ||
  !tabListEl ||
  !themeLightBtn ||
  !themeSystemBtn ||
  !themeDarkBtn ||
  !resetAllSettingsBtn ||
  !resetAllSettingsConfirmSubEl ||
  !resetAllSettingsAckInput ||
  !resetAllSettingsIncludeArchiveInput ||
  !resetAllSettingsCancelBtn ||
  !resetAllSettingsConfirmBtn ||
  !generalResetStatusBannerEl ||
  !generalResetStatusTextEl ||
  !generalResetStatusDismissBtn
) {
  throw new Error('Options DOM missing expected elements')
}

const resetAllSettingsAck = resetAllSettingsAckInput!
const resetAllSettingsIncludeArchive = resetAllSettingsIncludeArchiveInput!
const resetAllSettingsCancel = resetAllSettingsCancelBtn!
const resetAllSettingsConfirm = resetAllSettingsConfirmBtn!

const generalResetStatusBanner = generalResetStatusBannerEl!
const generalResetStatusText = generalResetStatusTextEl!
const generalResetStatusDismiss = generalResetStatusDismissBtn!

const themeLight = themeLightBtn
const themeSystem = themeSystemBtn
const themeDark = themeDarkBtn

const statusLine = statusEl
const assistantInput = assistantCb
const assistantAboutInput = assistantAboutCb
const editNavInput = editNavCb
const prevNextInput = prevNextCb
const jumpInput = jumpCb
const pastInput = pastIn
const futureInput = futureIn
const editScoresFloatingUpdateInput = editScoresFloatingUpdateCb
const editScoresFloatingUpdatePositionInput = editScoresFloatingUpdatePositionSelect
const floatingUpdateSub = editScoresFloatingUpdateSubEl!
const listSeasonScoreWeeksDateFormatEnabledInput =
  listSeasonScoreWeeksDateFormatEnabledCb
const listSeasonScoreWeeksFormatSub = listSeasonScoreWeeksFormatSubEl!
const listSeasonScoreWeeksDateFormatInput = listSeasonScoreWeeksDateFormatSelect
const listSeasonScoreWeeksVenuePlayDayEnabledInput =
  listSeasonScoreWeeksVenuePlayDayEnabledCb
const listSeasonScoreWeeksPlayDaySub = listSeasonScoreWeeksPlayDaySubEl!
const listSeasonScoreWeeksPlayDayOfWeekInput =
  listSeasonScoreWeeksPlayDayOfWeekSelect
const editScoresTablePaddingVInput = editScoresTablePaddingVIn
const editScoresTableSpacingResetButton =
  editScoresTableSpacingResetBtn as HTMLButtonElement
const duplicateRankBehaviorInput = editScoresDuplicateRankBehaviorSelect
const editScoresPlayerArchiveInput = editScoresPlayerArchiveCb
const editScoresPlayerNameFilterInput = editScoresPlayerNameFilterCb
const editScoresPlayerNameFilterCtrlFInput = editScoresPlayerNameFilterCtrlFCb
const editScoresPlayerNameFilterEscClearsInput =
  editScoresPlayerNameFilterEscClearsCb
const editScoresPlayerNameFilterIncludeArchivedInput =
  editScoresPlayerNameFilterIncludeArchivedCb
const nameFilterIncludeArchivedRow = nameFilterIncludeArchivedRowEl!
const showLoadedBadgeInput = showLoadedBadgeCb
const headerBuyMeACoffeeWrap = headerBuyMeACoffeeWrapEl!
const showBuyMeACoffeeHeaderInput = showBuyMeACoffeeHeaderCb
const syncSettingsInput = syncSettingsCb
const addPlayersInput = addPlayersCb
const addPlayerHighlightRequiredInput = addPlayerHighlightRequiredCb
const addPlayerDigitsInput = addPlayerDigitsIn
const addPlayerMinInput = addPlayerMinIn
const addPlayerMaxInput = addPlayerMaxIn
const subsettings = subsettingsEl
const seasonCountSub = seasonCountSubEl!
const addPlayersSub = addPlayersSubEl
const addPlayerHighlightSub = addPlayerHighlightSubEl
const addPlayerHighlightColorInput = addPlayerHighlightColorIn
const addPlayerHighlightOpacityInput = addPlayerHighlightOpacityIn
const addPlayerHighlightOpacityValueSpan = addPlayerHighlightOpacityValueSpanEl
const addPlayerDefaultFieldValuesEnabledInput = addPlayerDefaultFieldValuesEnabledCb
const addPlayerDefaultFieldValuesSub = addPlayerDefaultFieldValuesSubEl
const addPlayerDefaultAddress1Input = addPlayerDefaultAddress1In
const addPlayerDefaultAddress2Input = addPlayerDefaultAddress2In
const addPlayerDefaultTownInput = addPlayerDefaultTownIn
const addPlayerDefaultCountyInput = addPlayerDefaultCountyIn
const addPlayerDefaultPostcodeInput = addPlayerDefaultPostcodeIn
const playerNameFilterSub = playerNameFilterSubEl!

let themePref: SettingsUiThemePreference = STORAGE_DEFAULTS.settingsUiTheme

/** Digit count used with From/To when scaling on change (see `scaleBoundsWhenDigitsChange`). */
let lastMembershipDigitCount: number = STORAGE_DEFAULTS.addPlayerMembershipDigits

/** When false, From stays the minimum N-digit number; set true after the user edits From. */
let membershipMinCustomized: boolean = STORAGE_DEFAULTS.addPlayerMembershipMinCustomized

/** When false, To stays the maximum N-digit number; set true after the user edits To. */
let membershipMaxCustomized: boolean = STORAGE_DEFAULTS.addPlayerMembershipMaxCustomized

applyDocumentTheme(effectiveTheme(themePref))
syncSystemThemeListener(themePref, () => {
  applyDocumentTheme(effectiveTheme(themePref))
})

function refreshAppliedTheme(): void {
  applyDocumentTheme(effectiveTheme(themePref))
  syncSystemThemeListener(themePref, () => {
    applyDocumentTheme(effectiveTheme(themePref))
  })
}

function applyBuyMeACoffeeHeaderVisibility(show: boolean): void {
  headerBuyMeACoffeeWrap.hidden = !show
}

function syncThemeSegment(): void {
  themeLight.setAttribute('aria-pressed', String(themePref === 'light'))
  themeSystem.setAttribute('aria-pressed', String(themePref === 'system'))
  themeDark.setAttribute('aria-pressed', String(themePref === 'dark'))
}

function dismissGeneralResetSuccessBanner(): void {
  generalResetStatusBanner.hidden = true
  generalResetStatusText.textContent = ''
}

function showGeneralResetSuccessBanner(message: string): void {
  generalResetStatusText.textContent = message
  generalResetStatusBanner.hidden = false
}

function setError(message: string): void {
  dismissGeneralResetSuccessBanner()
  statusLine.className = 'save-status error'
  statusLine.textContent = message
}

const resetAllSettingsConfirmSub = resetAllSettingsConfirmSubEl!

function normalizeArchivedIdsForPreserve(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  for (const x of raw) {
    const n =
      typeof x === 'number'
        ? x
        : typeof x === 'string'
          ? Number.parseInt(x, 10)
          : NaN
    if (Number.isFinite(n)) out.push(Math.trunc(n))
  }
  return out
}

function closeResetSettingsConfirmPanel(): void {
  resetAllSettingsConfirmSub.hidden = true
  resetAllSettingsAck.checked = false
  resetAllSettingsIncludeArchive.checked = true
  resetAllSettingsConfirm.disabled = true
  resetAllSettingsConfirm.title = 'Enable by checking the box above'
}

function openResetSettingsConfirmPanel(): void {
  resetAllSettingsConfirmSub.hidden = false
  resetAllSettingsAck.checked = false
  resetAllSettingsIncludeArchive.checked = true
  resetAllSettingsConfirm.disabled = true
  resetAllSettingsConfirm.title = 'Enable by checking the box above'
  resetAllSettingsAck.focus()
}

function executeResetAllSettingsToDefaults(): void {
  settingsGet(ALL_KEYS, (items) => {
    const errGet = chrome.runtime.lastError
    if (errGet) {
      setError(errGet.message ?? 'Could not read settings before reset.')
      return
    }
    const includeArchive = resetAllSettingsIncludeArchive.checked
    const preservedArchivedIds = includeArchive
      ? null
      : normalizeArchivedIdsForPreserve(
          items[STORAGE_KEYS.editScoresArchivedPlayerIds],
        )

    settingsClearData((errClear) => {
      if (errClear) {
        setError(errClear ?? 'Could not reset settings.')
        return
      }
      const snapshot = getDefaultSettingsSnapshot()
      if (!includeArchive) {
        snapshot[STORAGE_KEYS.editScoresArchivedPlayerIds] = preservedArchivedIds
      }
      settingsSet(snapshot, () => {
        const err2 = chrome.runtime.lastError
        if (err2) {
          setError(err2.message ?? 'Could not save default settings.')
          return
        }
        closeResetSettingsConfirmPanel()
        showGeneralResetSuccessBanner(
          includeArchive
            ? 'All settings reset to defaults.'
            : 'All settings reset to defaults. Your archived player list was kept.',
        )
        load()
      })
    })
  })
}

const ALL_KEYS = Object.values(STORAGE_KEYS)

function clampSeasonCount(n: number): number {
  return Math.max(0, Math.min(24, Math.floor(n)))
}

function clampTablePaddingVerticalPx(n: number): number {
  return Math.max(2, Math.min(40, Math.floor(n)))
}

function normalizeEditScoresDuplicateRankBehavior(
  raw: unknown,
): EditScoresDuplicateRankBehavior {
  if (raw === 'off' || raw === 'highlight' || raw === 'prevent') return raw
  return STORAGE_DEFAULTS.editScoresDuplicateRankBehavior
}

function setSubsettingsVisible(show: boolean): void {
  subsettings.hidden = !show
}

function syncSubsettingsFromNav(): void {
  setSubsettingsVisible(editNavInput.checked)
}

function syncJumpSeasonSubFromToggle(): void {
  seasonCountSub.hidden =
    !editNavInput.checked || !jumpInput.checked
}

function syncPlayerNameFilterSubFromToggle(): void {
  playerNameFilterSub.hidden = !editScoresPlayerNameFilterInput.checked
}

function syncNameFilterIncludeArchivedRowFromToggle(): void {
  nameFilterIncludeArchivedRow.hidden = !editScoresPlayerArchiveInput.checked
}

function syncFloatingUpdateSubFromToggle(): void {
  floatingUpdateSub.hidden = !editScoresFloatingUpdateInput.checked
}

function syncListSeasonScoreWeeksFormatSubFromToggle(): void {
  listSeasonScoreWeeksFormatSub.hidden =
    !listSeasonScoreWeeksDateFormatEnabledInput.checked
}

function syncListSeasonScoreWeeksPlayDaySubFromToggle(): void {
  listSeasonScoreWeeksPlayDaySub.hidden =
    !listSeasonScoreWeeksVenuePlayDayEnabledInput.checked
}

function clampPlayDayOfWeek(n: number): number {
  if (!Number.isFinite(n)) return STORAGE_DEFAULTS.listSeasonScoreWeeksPlayDayOfWeek
  return ((Math.trunc(n) % 7) + 7) % 7
}

function currentListSeasonScoreWeeksFormatExampleIso(): string {
  return getListSeasonScoreWeeksFormatExampleIsoYmd(
    listSeasonScoreWeeksVenuePlayDayEnabledInput.checked,
    clampPlayDayOfWeek(
      Number.parseInt(listSeasonScoreWeeksPlayDayOfWeekInput.value, 10),
    ),
  )
}

let weekCommencingFormatExampleIso: string | null = null

function populateListSeasonScoreWeeksDateFormatSelect(exampleIso: string): void {
  weekCommencingFormatExampleIso = exampleIso
  listSeasonScoreWeeksDateFormatInput.replaceChildren()
  for (const id of WEEK_COMMENCING_DATE_FORMAT_IDS) {
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = getWeekCommencingFormatOptionLabel(id, exampleIso)
    listSeasonScoreWeeksDateFormatInput.appendChild(opt)
  }
}

function repopulateListSeasonScoreWeeksFormatSelectPreservingSelection(): void {
  const selected = listSeasonScoreWeeksDateFormatInput.value
  populateListSeasonScoreWeeksDateFormatSelect(
    currentListSeasonScoreWeeksFormatExampleIso(),
  )
  if (isWeekCommencingDateFormatId(selected)) {
    listSeasonScoreWeeksDateFormatInput.value = selected
  }
}

function refreshListSeasonScoreWeeksDateFormatLabelsIfWeekChanged(): void {
  const iso = currentListSeasonScoreWeeksFormatExampleIso()
  if (weekCommencingFormatExampleIso === iso) return
  const selected = listSeasonScoreWeeksDateFormatInput.value
  populateListSeasonScoreWeeksDateFormatSelect(iso)
  if (isWeekCommencingDateFormatId(selected)) {
    listSeasonScoreWeeksDateFormatInput.value = selected
  }
}

function setAddPlayersSubVisible(show: boolean): void {
  addPlayersSub.hidden = !show
}

function syncAddPlayersSubFromToggle(): void {
  setAddPlayersSubVisible(addPlayersInput.checked)
}

function syncHighlightRequiredSubFromToggle(): void {
  addPlayerHighlightSub.hidden = !addPlayerHighlightRequiredInput.checked
}

function syncDefaultFieldValuesSubFromToggle(): void {
  addPlayerDefaultFieldValuesSub.hidden =
    !addPlayerDefaultFieldValuesEnabledInput.checked
}

function saveDefaultFieldValueStrings(): void {
  save({
    [STORAGE_KEYS.addPlayerDefaultAddress1]: addPlayerDefaultAddress1Input.value,
    [STORAGE_KEYS.addPlayerDefaultAddress2]: addPlayerDefaultAddress2Input.value,
    [STORAGE_KEYS.addPlayerDefaultTown]: addPlayerDefaultTownInput.value,
    [STORAGE_KEYS.addPlayerDefaultCounty]: addPlayerDefaultCountyInput.value,
    [STORAGE_KEYS.addPlayerDefaultPostcode]: addPlayerDefaultPostcodeInput.value,
  })
}

function clampDigit20(n: number): number {
  return Math.max(1, Math.min(20, Math.floor(n)))
}

function readDigit20(el: HTMLInputElement): number {
  const n = Number.parseInt(el.value, 10)
  return Number.isFinite(n)
    ? clampDigit20(n)
    : STORAGE_DEFAULTS.addPlayerMembershipDigits
}

function readIntBound(el: HTMLInputElement): number {
  const n = Number.parseInt(el.value, 10)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function isMembershipBoundInputEmpty(el: HTMLInputElement): boolean {
  return el.value.trim() === ''
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function showMembershipVenueRefreshNote(): void {
  if (membershipRefreshNoteEl) membershipRefreshNoteEl.hidden = false
}

function membershipRangeIsInvalid(minV: number, maxV: number): boolean {
  return maxV <= minV
}

function syncMembershipRangeWarning(minV: number, maxV: number): void {
  const invalid = membershipRangeIsInvalid(minV, maxV)
  if (membershipRangeWarningEl) membershipRangeWarningEl.hidden = !invalid
  addPlayerMinInput.setAttribute('aria-invalid', invalid ? 'true' : 'false')
  addPlayerMaxInput.setAttribute('aria-invalid', invalid ? 'true' : 'false')
}

/**
 * When digit count changes: defaults follow min/max for N digits; customized bounds use append
 * `0` / `9` or trim (see product spec).
 */
function scaleBoundsWhenDigitsChange(oldDig: number, newDig: number): void {
  if (oldDig === newDig) return
  const o = clampDigit20(oldDig)
  const n = clampDigit20(newDig)
  if (o === n) return

  const loOld = minIntFullDigits(o)
  const hiOld = maxIntFullDigits(o)

  const loNew = minIntFullDigits(n)
  const hiNew = maxIntFullDigits(n)

  if (!membershipMinCustomized) {
    addPlayerMinInput.value = String(loNew)
  } else {
    const from = readIntBound(addPlayerMinInput)
    const fromStr = String(from)
    const fromOk =
      fromStr.length === o && from >= loOld && from <= hiOld
    if (!fromOk) {
      addPlayerMinInput.value = String(loNew)
    } else if (n > o) {
      addPlayerMinInput.value = fromStr + '0'.repeat(n - o)
    } else {
      addPlayerMinInput.value = fromStr.slice(0, -(o - n))
    }
  }

  if (!membershipMaxCustomized) {
    addPlayerMaxInput.value = String(hiNew)
  } else {
    const to = readIntBound(addPlayerMaxInput)
    const toStr = String(to)
    const toOk = toStr.length === o && to >= loOld && to <= hiOld
    if (!toOk) {
      addPlayerMaxInput.value = String(hiNew)
    } else if (n > o) {
      addPlayerMaxInput.value = toStr + '9'.repeat(n - o)
    } else {
      addPlayerMaxInput.value = toStr.slice(0, -(o - n))
    }
  }
}

function normalizeAddPlayerInputsDisplay(): void {
  const dig = readDigit20(addPlayerDigitsInput)
  addPlayerDigitsInput.value = String(dig)

  const lo = minIntFullDigits(dig)
  const hi = maxIntFullDigits(dig)
  let minV: number
  let maxV: number
  if (!membershipMinCustomized) {
    minV = lo
  } else if (isMembershipBoundInputEmpty(addPlayerMinInput)) {
    membershipMinCustomized = false
    minV = lo
  } else {
    minV = clampInt(readIntBound(addPlayerMinInput), lo, hi)
  }
  if (!membershipMaxCustomized) {
    maxV = hi
  } else if (isMembershipBoundInputEmpty(addPlayerMaxInput)) {
    membershipMaxCustomized = false
    maxV = hi
  } else {
    const rawMax = readIntBound(addPlayerMaxInput)
    // Empty parses as 0; clamp(0, lo, hi) wrongly becomes `lo` (smallest) — To should default to `hi` (all 9s).
    if (rawMax < lo) {
      membershipMaxCustomized = false
      maxV = hi
    } else {
      maxV = clampInt(rawMax, lo, hi)
    }
  }

  // From/To use `type="text"` so the browser never clamps values (number inputs did when min/max changed with digit count).
  addPlayerMinInput.value = String(minV)
  addPlayerMaxInput.value = String(maxV)
  syncMembershipRangeWarning(minV, maxV)
}

function normalizeAndSaveAddPlayerDigits(): void {
  normalizeAddPlayerInputsDisplay()
  save({
    [STORAGE_KEYS.addPlayerMembershipDigits]: readDigit20(addPlayerDigitsInput),
    [STORAGE_KEYS.addPlayerMembershipMinValue]: readIntBound(addPlayerMinInput),
    [STORAGE_KEYS.addPlayerMembershipMaxValue]: readIntBound(addPlayerMaxInput),
    [STORAGE_KEYS.addPlayerMembershipMinCustomized]: membershipMinCustomized,
    [STORAGE_KEYS.addPlayerMembershipMaxCustomized]: membershipMaxCustomized,
  })
}

function save(
  patch: Partial<Record<(typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS], unknown>>,
): void {
  settingsSet(patch as Record<string, unknown>, () => {
    const err = chrome.runtime.lastError
    if (err) {
      setError(err.message ?? 'Could not save. Try again.')
      return
    }
  })
}

let highlightOpacitySaveTimer: ReturnType<typeof setTimeout> | undefined

function syncHighlightOpacityLabel(): void {
  const pct = Number.parseInt(addPlayerHighlightOpacityInput.value, 10)
  const safe = Number.isFinite(pct) ? Math.min(50, Math.max(10, pct)) : 10
  addPlayerHighlightOpacityValueSpan.textContent = `${safe}%`
}

function applyHighlightOpacitySave(): void {
  const pct = Number.parseInt(addPlayerHighlightOpacityInput.value, 10)
  const safe = Number.isFinite(pct)
    ? Math.min(50, Math.max(10, pct))
    : 10
  addPlayerHighlightOpacityInput.value = String(safe)
  syncHighlightOpacityLabel()
  save({
    [STORAGE_KEYS.addPlayerHighlightRequiredOpacity]:
      normalizeAddPlayerHighlightOpacity(safe / 100),
  })
}

function scheduleHighlightOpacitySave(): void {
  if (highlightOpacitySaveTimer !== undefined) {
    clearTimeout(highlightOpacitySaveTimer)
  }
  highlightOpacitySaveTimer = window.setTimeout(() => {
    highlightOpacitySaveTimer = undefined
    applyHighlightOpacitySave()
  }, 450)
}

function load(): void {
  populateListSeasonScoreWeeksDateFormatSelect(
    getListSeasonScoreWeeksFormatExampleIsoYmd(
      STORAGE_DEFAULTS.listSeasonScoreWeeksVenuePlayDayEnabled,
      clampPlayDayOfWeek(STORAGE_DEFAULTS.listSeasonScoreWeeksPlayDayOfWeek),
    ),
  )
  chrome.storage.local.get([STORAGE_KEY_SYNC_SETTINGS_ENABLED], (local) => {
    const errLocal = chrome.runtime.lastError
    if (errLocal) {
      setError(errLocal.message ?? 'Could not load sync preference.')
      return
    }
    syncSettingsInput.checked =
      local[STORAGE_KEY_SYNC_SETTINGS_ENABLED] !== false

    settingsGet(ALL_KEYS, (items) => {
      const err = chrome.runtime.lastError
      if (err) {
        setError(err.message ?? 'Could not load settings.')
        return
      }
    const aEn = items[STORAGE_KEYS.assistantEnabled]
    const assistantOn =
      typeof aEn === 'boolean' ? aEn : STORAGE_DEFAULTS.assistantEnabled
    assistantInput.checked = assistantOn
    assistantAboutInput.checked = assistantOn
    const eNav = items[STORAGE_KEYS.editScoresNavEnabled]
    editNavInput.checked =
      typeof eNav === 'boolean' ? eNav : STORAGE_DEFAULTS.editScoresNavEnabled
    const ePn = items[STORAGE_KEYS.editScoresShowPrevNext]
    prevNextInput.checked =
      typeof ePn === 'boolean' ? ePn : STORAGE_DEFAULTS.editScoresShowPrevNext
    const eJ = items[STORAGE_KEYS.editScoresShowJump]
    jumpInput.checked =
      typeof eJ === 'boolean' ? eJ : STORAGE_DEFAULTS.editScoresShowJump

    const pastRaw = items[STORAGE_KEYS.editScoresSeasonsPast]
    const futureRaw = items[STORAGE_KEYS.editScoresSeasonsFuture]
    pastInput.value = String(
      typeof pastRaw === 'number'
        ? clampSeasonCount(pastRaw)
        : STORAGE_DEFAULTS.editScoresSeasonsPast,
    )
    futureInput.value = String(
      typeof futureRaw === 'number'
        ? clampSeasonCount(futureRaw)
        : STORAGE_DEFAULTS.editScoresSeasonsFuture,
    )

    const floatUp = items[STORAGE_KEYS.editScoresFloatingUpdateEnabled]
    editScoresFloatingUpdateInput.checked =
      typeof floatUp === 'boolean'
        ? floatUp
        : STORAGE_DEFAULTS.editScoresFloatingUpdateEnabled

    const posRaw = items[STORAGE_KEYS.editScoresFloatingUpdatePosition]
    editScoresFloatingUpdatePositionInput.value =
      posRaw === 'left' ? 'left' : 'right'

    const wcEn = items[STORAGE_KEYS.listSeasonScoreWeeksDateFormatEnabled]
    listSeasonScoreWeeksDateFormatEnabledInput.checked =
      typeof wcEn === 'boolean'
        ? wcEn
        : STORAGE_DEFAULTS.listSeasonScoreWeeksDateFormatEnabled

    const venuePdEn = items[STORAGE_KEYS.listSeasonScoreWeeksVenuePlayDayEnabled]
    listSeasonScoreWeeksVenuePlayDayEnabledInput.checked =
      typeof venuePdEn === 'boolean'
        ? venuePdEn
        : STORAGE_DEFAULTS.listSeasonScoreWeeksVenuePlayDayEnabled

    const pdRaw = items[STORAGE_KEYS.listSeasonScoreWeeksPlayDayOfWeek]
    const playDayVal = clampPlayDayOfWeek(
      typeof pdRaw === 'number' && Number.isFinite(pdRaw)
        ? pdRaw
        : Number.parseInt(String(pdRaw ?? ''), 10),
    )
    listSeasonScoreWeeksPlayDayOfWeekInput.value = String(playDayVal)

    const wcFmt = coerceWeekCommencingDateFormatId(
      items[STORAGE_KEYS.listSeasonScoreWeeksDateFormat],
      STORAGE_DEFAULTS.listSeasonScoreWeeksDateFormat as WeekCommencingDateFormatId,
    )
    populateListSeasonScoreWeeksDateFormatSelect(
      getListSeasonScoreWeeksFormatExampleIsoYmd(
        listSeasonScoreWeeksVenuePlayDayEnabledInput.checked,
        playDayVal,
      ),
    )
    listSeasonScoreWeeksDateFormatInput.value = wcFmt

    const padVRaw = items[STORAGE_KEYS.editScoresTableCellPaddingVerticalPx]
    editScoresTablePaddingVInput.value = String(
      typeof padVRaw === 'number' && Number.isFinite(padVRaw)
        ? clampTablePaddingVerticalPx(padVRaw)
        : STORAGE_DEFAULTS.editScoresTableCellPaddingVerticalPx,
    )

    duplicateRankBehaviorInput.value = normalizeEditScoresDuplicateRankBehavior(
      items[STORAGE_KEYS.editScoresDuplicateRankBehavior],
    )

    const archEn = items[STORAGE_KEYS.editScoresPlayerArchiveEnabled]
    editScoresPlayerArchiveInput.checked =
      typeof archEn === 'boolean'
        ? archEn
        : STORAGE_DEFAULTS.editScoresPlayerArchiveEnabled

    const nameFilterEn = items[STORAGE_KEYS.editScoresPlayerNameFilterEnabled]
    editScoresPlayerNameFilterInput.checked =
      typeof nameFilterEn === 'boolean'
        ? nameFilterEn
        : STORAGE_DEFAULTS.editScoresPlayerNameFilterEnabled

    const includeArchF = items[STORAGE_KEYS.editScoresPlayerNameFilterIncludeArchived]
    editScoresPlayerNameFilterIncludeArchivedInput.checked =
      typeof includeArchF === 'boolean'
        ? includeArchF
        : STORAGE_DEFAULTS.editScoresPlayerNameFilterIncludeArchived

    const ctrlFF = items[STORAGE_KEYS.editScoresPlayerNameFilterCtrlFToFocus]
    editScoresPlayerNameFilterCtrlFInput.checked =
      typeof ctrlFF === 'boolean'
        ? ctrlFF
        : STORAGE_DEFAULTS.editScoresPlayerNameFilterCtrlFToFocus

    const escClr = items[STORAGE_KEYS.editScoresPlayerNameFilterEscClears]
    editScoresPlayerNameFilterEscClearsInput.checked =
      typeof escClr === 'boolean'
        ? escClr
        : STORAGE_DEFAULTS.editScoresPlayerNameFilterEscClears

    const showBadge = items[STORAGE_KEYS.showLoadedBadge]
    showLoadedBadgeInput.checked =
      typeof showBadge === 'boolean' ? showBadge : STORAGE_DEFAULTS.showLoadedBadge

    const showBmc = items[STORAGE_KEYS.showBuyMeACoffeeHeaderLink]
    const bmcOn =
      typeof showBmc === 'boolean'
        ? showBmc
        : STORAGE_DEFAULTS.showBuyMeACoffeeHeaderLink
    showBuyMeACoffeeHeaderInput.checked = bmcOn
    applyBuyMeACoffeeHeaderVisibility(bmcOn)

    const apEn = items[STORAGE_KEYS.addPlayersEnabled]
    addPlayersInput.checked =
      typeof apEn === 'boolean' ? apEn : STORAGE_DEFAULTS.addPlayersEnabled

    const apHl = items[STORAGE_KEYS.addPlayerHighlightRequiredFields]
    addPlayerHighlightRequiredInput.checked =
      typeof apHl === 'boolean'
        ? apHl
        : STORAGE_DEFAULTS.addPlayerHighlightRequiredFields

    const hlColorRaw = items[STORAGE_KEYS.addPlayerHighlightRequiredColor]
    addPlayerHighlightColorInput.value = normalizeAddPlayerHighlightHex(
      typeof hlColorRaw === 'string'
        ? hlColorRaw
        : STORAGE_DEFAULTS.addPlayerHighlightRequiredColor,
    )

    const hlOpRaw = items[STORAGE_KEYS.addPlayerHighlightRequiredOpacity]
    const hlOp = normalizeAddPlayerHighlightOpacity(
      hlOpRaw !== undefined && hlOpRaw !== null
        ? hlOpRaw
        : STORAGE_DEFAULTS.addPlayerHighlightRequiredOpacity,
    )
    addPlayerHighlightOpacityInput.value = String(
      Math.min(50, Math.max(10, Math.round(hlOp * 100))),
    )
    syncHighlightOpacityLabel()

    const apDef = items[STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled]
    addPlayerDefaultFieldValuesEnabledInput.checked =
      typeof apDef === 'boolean'
        ? apDef
        : STORAGE_DEFAULTS.addPlayerDefaultFieldValuesEnabled

    const defA1 = items[STORAGE_KEYS.addPlayerDefaultAddress1]
    addPlayerDefaultAddress1Input.value =
      typeof defA1 === 'string'
        ? defA1
        : STORAGE_DEFAULTS.addPlayerDefaultAddress1
    const defA2 = items[STORAGE_KEYS.addPlayerDefaultAddress2]
    addPlayerDefaultAddress2Input.value =
      typeof defA2 === 'string'
        ? defA2
        : STORAGE_DEFAULTS.addPlayerDefaultAddress2
    const defTown = items[STORAGE_KEYS.addPlayerDefaultTown]
    addPlayerDefaultTownInput.value =
      typeof defTown === 'string'
        ? defTown
        : STORAGE_DEFAULTS.addPlayerDefaultTown
    const defCounty = items[STORAGE_KEYS.addPlayerDefaultCounty]
    addPlayerDefaultCountyInput.value =
      typeof defCounty === 'string'
        ? defCounty
        : STORAGE_DEFAULTS.addPlayerDefaultCounty
    const defPc = items[STORAGE_KEYS.addPlayerDefaultPostcode]
    addPlayerDefaultPostcodeInput.value =
      typeof defPc === 'string'
        ? defPc
        : STORAGE_DEFAULTS.addPlayerDefaultPostcode

    const dDig = items[STORAGE_KEYS.addPlayerMembershipDigits]
    addPlayerDigitsInput.value = String(
      typeof dDig === 'number'
        ? clampDigit20(dDig)
        : STORAGE_DEFAULTS.addPlayerMembershipDigits,
    )

    const minCust = items[STORAGE_KEYS.addPlayerMembershipMinCustomized]
    membershipMinCustomized =
      typeof minCust === 'boolean'
        ? minCust
        : STORAGE_DEFAULTS.addPlayerMembershipMinCustomized
    const maxCust = items[STORAGE_KEYS.addPlayerMembershipMaxCustomized]
    membershipMaxCustomized =
      typeof maxCust === 'boolean'
        ? maxCust
        : STORAGE_DEFAULTS.addPlayerMembershipMaxCustomized

    const dMin = items[STORAGE_KEYS.addPlayerMembershipMinValue]
    if (membershipMinCustomized) {
      addPlayerMinInput.value = String(
        typeof dMin === 'number' && Number.isFinite(dMin)
          ? Math.trunc(dMin)
          : STORAGE_DEFAULTS.addPlayerMembershipMinValue,
      )
    }
    const dMax = items[STORAGE_KEYS.addPlayerMembershipMaxValue]
    if (membershipMaxCustomized) {
      addPlayerMaxInput.value = String(
        typeof dMax === 'number' && Number.isFinite(dMax)
          ? Math.trunc(dMax)
          : STORAGE_DEFAULTS.addPlayerMembershipMaxValue,
      )
    }
    normalizeAddPlayerInputsDisplay()
    lastMembershipDigitCount = readDigit20(addPlayerDigitsInput)
    save({
      [STORAGE_KEYS.addPlayerMembershipDigits]: readDigit20(addPlayerDigitsInput),
      [STORAGE_KEYS.addPlayerMembershipMinValue]: readIntBound(addPlayerMinInput),
      [STORAGE_KEYS.addPlayerMembershipMaxValue]: readIntBound(addPlayerMaxInput),
      [STORAGE_KEYS.addPlayerMembershipMinCustomized]: membershipMinCustomized,
      [STORAGE_KEYS.addPlayerMembershipMaxCustomized]: membershipMaxCustomized,
    })

    themePref = parseThemePref(items[STORAGE_KEYS.settingsUiTheme])
    refreshAppliedTheme()
    syncThemeSegment()

    syncSubsettingsFromNav()
    syncJumpSeasonSubFromToggle()
    syncFloatingUpdateSubFromToggle()
    syncListSeasonScoreWeeksFormatSubFromToggle()
    syncListSeasonScoreWeeksPlayDaySubFromToggle()
    syncAddPlayersSubFromToggle()
    syncHighlightRequiredSubFromToggle()
    syncDefaultFieldValuesSubFromToggle()
    syncPlayerNameFilterSubFromToggle()
    syncNameFilterIncludeArchivedRowFromToggle()

    const tabs = Array.from(
      tabListEl!.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    const savedId = items[STORAGE_KEYS.settingsActiveTabId]
    const normalizedTabId =
      savedId === 'tab-misc' ? 'tab-general' : savedId
    const match =
      typeof normalizedTabId === 'string'
        ? tabs.find((t) => t.id === normalizedTabId)
        : undefined
    activateTab(match ?? tabs[0]!)
    if (savedId === 'tab-misc') {
      save({ [STORAGE_KEYS.settingsActiveTabId]: 'tab-general' })
    }
    })
  })
}

function setAssistantEnabled(checked: boolean): void {
  assistantInput.checked = checked
  assistantAboutInput.checked = checked
  save({ [STORAGE_KEYS.assistantEnabled]: checked })
}

assistantInput.addEventListener('change', () => {
  setAssistantEnabled(assistantInput.checked)
})

assistantAboutInput.addEventListener('change', () => {
  setAssistantEnabled(assistantAboutInput.checked)
})

syncSettingsInput.addEventListener('change', () => {
  const next = syncSettingsInput.checked
  syncSettingsInput.disabled = true
  setSyncSettingsEnabled(next, (err) => {
    syncSettingsInput.disabled = false
    if (err) {
      setError(err)
      syncSettingsInput.checked = !next
      return
    }
    dismissGeneralResetSuccessBanner()
    load()
  })
})

editNavInput.addEventListener('change', () => {
  save({ [STORAGE_KEYS.editScoresNavEnabled]: editNavInput.checked })
  syncSubsettingsFromNav()
  syncJumpSeasonSubFromToggle()
})

prevNextInput.addEventListener('change', () => {
  save({ [STORAGE_KEYS.editScoresShowPrevNext]: prevNextInput.checked })
})

jumpInput.addEventListener('change', () => {
  save({ [STORAGE_KEYS.editScoresShowJump]: jumpInput.checked })
  syncJumpSeasonSubFromToggle()
})

function readNum(el: HTMLInputElement): number {
  const n = Number.parseInt(el.value, 10)
  return Number.isFinite(n) ? clampSeasonCount(n) : 0
}

pastInput.addEventListener('change', () => {
  pastInput.value = String(readNum(pastInput))
  save({ [STORAGE_KEYS.editScoresSeasonsPast]: readNum(pastInput) })
})

futureInput.addEventListener('change', () => {
  futureInput.value = String(readNum(futureInput))
  save({ [STORAGE_KEYS.editScoresSeasonsFuture]: readNum(futureInput) })
})

editScoresFloatingUpdateInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresFloatingUpdateEnabled]:
      editScoresFloatingUpdateInput.checked,
  })
  syncFloatingUpdateSubFromToggle()
})

editScoresFloatingUpdatePositionInput.addEventListener('change', () => {
  const v = editScoresFloatingUpdatePositionInput.value
  save({
    [STORAGE_KEYS.editScoresFloatingUpdatePosition]: v === 'left' ? 'left' : 'right',
  })
})

listSeasonScoreWeeksDateFormatEnabledInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.listSeasonScoreWeeksDateFormatEnabled]:
      listSeasonScoreWeeksDateFormatEnabledInput.checked,
  })
  syncListSeasonScoreWeeksFormatSubFromToggle()
  syncListSeasonScoreWeeksPlayDaySubFromToggle()
})

listSeasonScoreWeeksVenuePlayDayEnabledInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.listSeasonScoreWeeksVenuePlayDayEnabled]:
      listSeasonScoreWeeksVenuePlayDayEnabledInput.checked,
  })
  syncListSeasonScoreWeeksPlayDaySubFromToggle()
  repopulateListSeasonScoreWeeksFormatSelectPreservingSelection()
})

listSeasonScoreWeeksPlayDayOfWeekInput.addEventListener('change', () => {
  const v = clampPlayDayOfWeek(
    Number.parseInt(listSeasonScoreWeeksPlayDayOfWeekInput.value, 10),
  )
  listSeasonScoreWeeksPlayDayOfWeekInput.value = String(v)
  save({ [STORAGE_KEYS.listSeasonScoreWeeksPlayDayOfWeek]: v })
  repopulateListSeasonScoreWeeksFormatSelectPreservingSelection()
})

listSeasonScoreWeeksDateFormatInput.addEventListener('change', () => {
  const v = listSeasonScoreWeeksDateFormatInput.value
  if (!isWeekCommencingDateFormatId(v)) return
  save({ [STORAGE_KEYS.listSeasonScoreWeeksDateFormat]: v })
})

window.addEventListener('focus', refreshListSeasonScoreWeeksDateFormatLabelsIfWeekChanged)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshListSeasonScoreWeeksDateFormatLabelsIfWeekChanged()
  }
})

function readTablePaddingVertical(): number {
  const n = Number.parseInt(editScoresTablePaddingVInput.value, 10)
  return Number.isFinite(n)
    ? clampTablePaddingVerticalPx(n)
    : STORAGE_DEFAULTS.editScoresTableCellPaddingVerticalPx
}

editScoresTablePaddingVInput.addEventListener('change', () => {
  const v = readTablePaddingVertical()
  editScoresTablePaddingVInput.value = String(v)
  save({ [STORAGE_KEYS.editScoresTableCellPaddingVerticalPx]: v })
})

editScoresTableSpacingResetButton.addEventListener('click', () => {
  const v = STORAGE_DEFAULTS.editScoresTableCellPaddingVerticalPx
  editScoresTablePaddingVInput.value = String(v)
  save({ [STORAGE_KEYS.editScoresTableCellPaddingVerticalPx]: v })
})

duplicateRankBehaviorInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresDuplicateRankBehavior]:
      normalizeEditScoresDuplicateRankBehavior(duplicateRankBehaviorInput.value),
  })
})

editScoresPlayerArchiveInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresPlayerArchiveEnabled]: editScoresPlayerArchiveInput.checked,
  })
  syncNameFilterIncludeArchivedRowFromToggle()
})

editScoresPlayerNameFilterInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresPlayerNameFilterEnabled]:
      editScoresPlayerNameFilterInput.checked,
  })
  syncPlayerNameFilterSubFromToggle()
})

editScoresPlayerNameFilterCtrlFInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresPlayerNameFilterCtrlFToFocus]:
      editScoresPlayerNameFilterCtrlFInput.checked,
  })
})

editScoresPlayerNameFilterEscClearsInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresPlayerNameFilterEscClears]:
      editScoresPlayerNameFilterEscClearsInput.checked,
  })
})

editScoresPlayerNameFilterIncludeArchivedInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.editScoresPlayerNameFilterIncludeArchived]:
      editScoresPlayerNameFilterIncludeArchivedInput.checked,
  })
})

showLoadedBadgeInput.addEventListener('change', () => {
  save({ [STORAGE_KEYS.showLoadedBadge]: showLoadedBadgeInput.checked })
})

showBuyMeACoffeeHeaderInput.addEventListener('change', () => {
  const on = showBuyMeACoffeeHeaderInput.checked
  save({ [STORAGE_KEYS.showBuyMeACoffeeHeaderLink]: on })
  applyBuyMeACoffeeHeaderVisibility(on)
})

addPlayersInput.addEventListener('change', () => {
  save({ [STORAGE_KEYS.addPlayersEnabled]: addPlayersInput.checked })
  syncAddPlayersSubFromToggle()
})

addPlayerHighlightRequiredInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.addPlayerHighlightRequiredFields]:
      addPlayerHighlightRequiredInput.checked,
  })
  syncHighlightRequiredSubFromToggle()
})

/** Color `input` fires many times per second while dragging; debounce sync writes to stay under MAX_WRITE_OPERATIONS_PER_MINUTE. */
let highlightColorSaveTimer: ReturnType<typeof setTimeout> | undefined

function normalizeHighlightColorInputValue(): string {
  const hex = normalizeAddPlayerHighlightHex(addPlayerHighlightColorInput.value)
  addPlayerHighlightColorInput.value = hex
  return hex
}

function scheduleHighlightColorSave(): void {
  if (highlightColorSaveTimer !== undefined) {
    clearTimeout(highlightColorSaveTimer)
  }
  highlightColorSaveTimer = window.setTimeout(() => {
    highlightColorSaveTimer = undefined
    const hex = normalizeHighlightColorInputValue()
    save({ [STORAGE_KEYS.addPlayerHighlightRequiredColor]: hex })
  }, 450)
}

addPlayerHighlightColorInput.addEventListener('input', () => {
  normalizeHighlightColorInputValue()
  scheduleHighlightColorSave()
})

addPlayerHighlightColorInput.addEventListener('change', () => {
  if (highlightColorSaveTimer !== undefined) {
    clearTimeout(highlightColorSaveTimer)
    highlightColorSaveTimer = undefined
  }
  const hex = normalizeHighlightColorInputValue()
  save({ [STORAGE_KEYS.addPlayerHighlightRequiredColor]: hex })
})

addPlayerHighlightOpacityInput.addEventListener('input', () => {
  syncHighlightOpacityLabel()
  scheduleHighlightOpacitySave()
})

addPlayerHighlightOpacityInput.addEventListener('change', () => {
  if (highlightOpacitySaveTimer !== undefined) {
    clearTimeout(highlightOpacitySaveTimer)
    highlightOpacitySaveTimer = undefined
  }
  applyHighlightOpacitySave()
})

addPlayerDefaultFieldValuesEnabledInput.addEventListener('change', () => {
  save({
    [STORAGE_KEYS.addPlayerDefaultFieldValuesEnabled]:
      addPlayerDefaultFieldValuesEnabledInput.checked,
  })
  syncDefaultFieldValuesSubFromToggle()
})

addPlayerDefaultAddress1Input.addEventListener('change', saveDefaultFieldValueStrings)
addPlayerDefaultAddress2Input.addEventListener('change', saveDefaultFieldValueStrings)
addPlayerDefaultTownInput.addEventListener('change', saveDefaultFieldValueStrings)
addPlayerDefaultCountyInput.addEventListener('change', saveDefaultFieldValueStrings)
addPlayerDefaultPostcodeInput.addEventListener('change', saveDefaultFieldValueStrings)

addPlayerDigitsInput.addEventListener('change', () => {
  const newDig = readDigit20(addPlayerDigitsInput)
  const oldDig = lastMembershipDigitCount
  scaleBoundsWhenDigitsChange(oldDig, newDig)
  normalizeAndSaveAddPlayerDigits()
  lastMembershipDigitCount = readDigit20(addPlayerDigitsInput)
  showMembershipVenueRefreshNote()
})

function commitMembershipMinInput(): void {
  membershipMinCustomized = !isMembershipBoundInputEmpty(addPlayerMinInput)
  normalizeAndSaveAddPlayerDigits()
  showMembershipVenueRefreshNote()
}

function commitMembershipMaxInput(): void {
  membershipMaxCustomized = !isMembershipBoundInputEmpty(addPlayerMaxInput)
  normalizeAndSaveAddPlayerDigits()
  showMembershipVenueRefreshNote()
}

addPlayerMinInput.addEventListener('change', commitMembershipMinInput)

addPlayerMaxInput.addEventListener('change', commitMembershipMaxInput)

addPlayerMinInput.addEventListener('blur', () => {
  if (!isMembershipBoundInputEmpty(addPlayerMinInput)) return
  membershipMinCustomized = false
  normalizeAndSaveAddPlayerDigits()
  showMembershipVenueRefreshNote()
})

addPlayerMaxInput.addEventListener('blur', () => {
  if (!isMembershipBoundInputEmpty(addPlayerMaxInput)) return
  membershipMaxCustomized = false
  normalizeAndSaveAddPlayerDigits()
  showMembershipVenueRefreshNote()
})

function setThemePreference(next: SettingsUiThemePreference): void {
  themePref = next
  syncThemeSegment()
  save({ [STORAGE_KEYS.settingsUiTheme]: next })
  refreshAppliedTheme()
}

themeLight.addEventListener('click', () => {
  setThemePreference('light')
})

themeSystem.addEventListener('click', () => {
  setThemePreference('system')
})

themeDark.addEventListener('click', () => {
  setThemePreference('dark')
})

const tabButtons = () =>
  Array.from(tabListEl.querySelectorAll<HTMLButtonElement>('[role="tab"]'))

function activateTab(tab: HTMLButtonElement): void {
  const panelId = tab.getAttribute('aria-controls')
  if (!panelId) return

  for (const t of tabButtons()) {
    const selected = t === tab
    t.setAttribute('aria-selected', String(selected))
    t.tabIndex = selected ? 0 : -1
  }

  for (const el of document.querySelectorAll<HTMLDivElement>('[role="tabpanel"]')) {
    el.hidden = el.id !== panelId
  }
}

function persistActiveTabId(tab: HTMLButtonElement): void {
  settingsSet(
    { [STORAGE_KEYS.settingsActiveTabId]: tab.id },
    () => {
      const err = chrome.runtime.lastError
      if (err) console.warn('[Redtooth TD Assistant]', err.message)
    },
  )
}

function selectTab(tab: HTMLButtonElement): void {
  activateTab(tab)
  persistActiveTabId(tab)
}

tabListEl.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]')
  if (!t || !tabListEl.contains(t)) return
  selectTab(t)
})

tabListEl.addEventListener('keydown', (e) => {
  const tabs = tabButtons()
  const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
  if (i < 0) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = (i + dir + tabs.length) % tabs.length
    selectTab(tabs[next]!)
    tabs[next]!.focus()
  }
  if (e.key === 'Home') {
    e.preventDefault()
    selectTab(tabs[0]!)
    tabs[0]!.focus()
  }
  if (e.key === 'End') {
    e.preventDefault()
    selectTab(tabs[tabs.length - 1]!)
    tabs[tabs.length - 1]!.focus()
  }
})

generalResetStatusDismiss.addEventListener('click', () => {
  dismissGeneralResetSuccessBanner()
})

resetAllSettingsBtn.addEventListener('click', () => {
  openResetSettingsConfirmPanel()
})

resetAllSettingsCancel.addEventListener('click', () => {
  closeResetSettingsConfirmPanel()
})

resetAllSettingsAck.addEventListener('change', () => {
  const on = resetAllSettingsAck.checked
  resetAllSettingsConfirm.disabled = !on
  resetAllSettingsConfirm.title = on
    ? 'Reset every option to factory defaults in this browser'
    : 'Enable by checking the box above'
})

resetAllSettingsConfirm.addEventListener('click', () => {
  if (!resetAllSettingsAck.checked) return
  executeResetAllSettingsToDefaults()
})

load()
