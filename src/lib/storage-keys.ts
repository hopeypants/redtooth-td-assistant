/** Sync storage keys and defaults for options + content scripts */

import {
  DEFAULT_ADD_PLAYER_HIGHLIGHT_HEX,
  DEFAULT_ADD_PLAYER_HIGHLIGHT_OPACITY,
} from './highlight-color'

export const STORAGE_KEYS = {
  assistantEnabled: 'assistantEnabled',
  editScoresNavEnabled: 'editScoresNavEnabled',
  editScoresShowPrevNext: 'editScoresShowPrevNext',
  editScoresShowJump: 'editScoresShowJump',
  editScoresSeasonsPast: 'editScoresSeasonsPast',
  editScoresSeasonsFuture: 'editScoresSeasonsFuture',
  /** Fixed-position Update control on Edit Scores (bottom-right). */
  editScoresFloatingUpdateEnabled: 'editScoresFloatingUpdateEnabled',
  /** `'left' | 'right'` — horizontal side for the floating Update button. */
  editScoresFloatingUpdatePosition: 'editScoresFloatingUpdatePosition',
  /** Vertical padding (px) for `.styledTbl td` on Edit Scores; horizontal stays 15px. */
  editScoresTableCellPaddingVerticalPx: 'editScoresTableCellPaddingVerticalPx',
  /**
   * Edit Scores rank dropdowns (`player_ranks`): `off` = site default, `highlight` = outline
   * duplicates + warning below archive bar, `prevent` = remove ranks already chosen elsewhere.
   */
  editScoresDuplicateRankBehavior: 'editScoresDuplicateRankBehavior',
  /** Hide chosen players on Edit Scores (client-side only; IDs in `editScoresArchivedPlayerIds`). */
  editScoresPlayerArchiveEnabled: 'editScoresPlayerArchiveEnabled',
  /** Edit Scores: live filter by player name in the archive bar (substring match). */
  editScoresPlayerNameFilterEnabled: 'editScoresPlayerNameFilterEnabled',
  /** While the name filter has text, show matching archived rows (Edit Scores: name only; Venue Players: name or membership). */
  editScoresPlayerNameFilterIncludeArchived: 'editScoresPlayerNameFilterIncludeArchived',
  /** Ctrl+F / Cmd+F focuses the player name filter instead of the browser find UI. */
  editScoresPlayerNameFilterCtrlFToFocus: 'editScoresPlayerNameFilterCtrlFToFocus',
  /** Escape clears the name filter when the filter input is focused. */
  editScoresPlayerNameFilterEscClears: 'editScoresPlayerNameFilterEscClears',
  /** Redtooth `player_<id>` numeric ids to treat as inactive / hidden on Edit Scores. */
  editScoresArchivedPlayerIds: 'editScoresArchivedPlayerIds',
  /** Fixed “loaded” pill on venue admin pages (position avoids floating Update when both on the left). */
  showLoadedBadge: 'showLoadedBadge',
  /** Options page only: 'light' | 'dark' | 'system' */
  settingsUiTheme: 'settingsUiTheme',
  /** Options page: last focused tab button `id` (e.g. `tab-general`). */
  settingsActiveTabId: 'settingsActiveTabId',
  /** Add player / membership number tools */
  addPlayersEnabled: 'addPlayersEnabled',
  /** Digit count for membership numbers (full N-digit range: 10^(N−1)…10^N−1). */
  addPlayerMembershipDigits: 'addPlayerMembershipDigits',
  /** Inclusive From / To for Generate (each must be exactly N digits in decimal). */
  addPlayerMembershipMinValue: 'addPlayerMembershipMinValue',
  addPlayerMembershipMaxValue: 'addPlayerMembershipMaxValue',
  /** When false, From follows the lowest N-digit number for the selected digit count. */
  addPlayerMembershipMinCustomized: 'addPlayerMembershipMinCustomized',
  /** When false, To follows the highest N-digit number for the selected digit count. */
  addPlayerMembershipMaxCustomized: 'addPlayerMembershipMaxCustomized',
  /** Add player form: outline required fields (membership, name, address, etc.). */
  addPlayerHighlightRequiredFields: 'addPlayerHighlightRequiredFields',
  /** `#rrggbb` — base color for required-field background tint. */
  addPlayerHighlightRequiredColor: 'addPlayerHighlightRequiredColor',
  /** Opacity of the tint (0.1–0.5). */
  addPlayerHighlightRequiredOpacity: 'addPlayerHighlightRequiredOpacity',
  /** When true, fill blank address fields on add player from stored defaults. */
  addPlayerDefaultFieldValuesEnabled: 'addPlayerDefaultFieldValuesEnabled',
  addPlayerDefaultAddress1: 'addPlayerDefaultAddress1',
  addPlayerDefaultAddress2: 'addPlayerDefaultAddress2',
  addPlayerDefaultTown: 'addPlayerDefaultTown',
  addPlayerDefaultCounty: 'addPlayerDefaultCounty',
  addPlayerDefaultPostcode: 'addPlayerDefaultPostcode',
  /**
   * List Season Score Weeks (`venue_admin/ListSeasonScoreWeeks`): friendlier date display
   * instead of yyyy-mm-dd.
   */
  listSeasonScoreWeeksDateFormatEnabled: 'listSeasonScoreWeeksDateFormatEnabled',
  /**
   * How to show dates when enabled (`iso` = leave Redtooth’s yyyy-mm-dd unchanged).
   */
  listSeasonScoreWeeksDateFormat: 'listSeasonScoreWeeksDateFormat',
  /**
   * List Season Score Weeks: treat Redtooth’s date as a day in the Sun–Sat week and show
   * the venue’s play day instead; column heading becomes “Day”.
   */
  listSeasonScoreWeeksVenuePlayDayEnabled: 'listSeasonScoreWeeksVenuePlayDayEnabled',
  /** 0 = Sunday … 6 = Saturday — day the venue plays (same Sun–Sat week as Redtooth’s date). */
  listSeasonScoreWeeksPlayDayOfWeek: 'listSeasonScoreWeeksPlayDayOfWeek',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export type EditScoresDuplicateRankBehavior = 'off' | 'highlight' | 'prevent'

export const STORAGE_DEFAULTS = {
  assistantEnabled: true,
  editScoresNavEnabled: true,
  editScoresShowPrevNext: true,
  editScoresShowJump: true,
  editScoresSeasonsPast: 1,
  editScoresSeasonsFuture: 0,
  editScoresFloatingUpdateEnabled: true,
  editScoresFloatingUpdatePosition: 'right' as const,
  editScoresTableCellPaddingVerticalPx: 15,
  editScoresDuplicateRankBehavior: 'highlight' as const,
  editScoresPlayerArchiveEnabled: true,
  editScoresPlayerNameFilterEnabled: true,
  editScoresPlayerNameFilterIncludeArchived: true,
  editScoresPlayerNameFilterCtrlFToFocus: true,
  editScoresPlayerNameFilterEscClears: true,
  editScoresArchivedPlayerIds: [] as number[],
  showLoadedBadge: true,
  settingsUiTheme: 'system' as const,
  settingsActiveTabId: 'tab-general',
  addPlayersEnabled: true,
  addPlayerMembershipDigits: 6,
  addPlayerMembershipMinValue: 100_000,
  addPlayerMembershipMaxValue: 999_999,
  addPlayerMembershipMinCustomized: false,
  addPlayerMembershipMaxCustomized: false,
  addPlayerHighlightRequiredFields: false,
  addPlayerHighlightRequiredColor: DEFAULT_ADD_PLAYER_HIGHLIGHT_HEX,
  addPlayerHighlightRequiredOpacity: DEFAULT_ADD_PLAYER_HIGHLIGHT_OPACITY,
  addPlayerDefaultFieldValuesEnabled: false,
  addPlayerDefaultAddress1: '',
  addPlayerDefaultAddress2: '',
  addPlayerDefaultTown: '',
  addPlayerDefaultCounty: '',
  addPlayerDefaultPostcode: '',
  /** New installs: friendlier dates on List Season Score Weeks (on by default). */
  listSeasonScoreWeeksDateFormatEnabled: true,
  /** Default: weekday, day, full month, year (UK), e.g. Wednesday, 8 April 2026 */
  listSeasonScoreWeeksDateFormat: 'EEEE_comma_d_MMMM_yyyy',
  /** New installs: venue play day off; use with options HTML defaults for first paint. */
  listSeasonScoreWeeksVenuePlayDayEnabled: false,
  /** Sunday */
  listSeasonScoreWeeksPlayDayOfWeek: 0,
} as const

export type SettingsUiThemePreference = 'light' | 'dark' | 'system'

/** Deep clone for `chrome.storage.sync.set` after reset. */
export function getDefaultSettingsSnapshot(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(STORAGE_DEFAULTS)) as Record<string, unknown>
}
