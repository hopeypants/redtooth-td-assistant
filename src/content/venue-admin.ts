import { initAddPlayerDetails } from './add-player-details'
import { initEditScoresDuplicateRanks } from './edit-scores-duplicate-ranks'
import { initEditScoresRankHeaderCount } from './edit-scores-rank-header-count'
import { initEditScoresRankRowFocus } from './edit-scores-rank-row-focus'
import { initEditScoresPlayerArchive } from './edit-scores-player-archive'
import { initEditScoresTableRowPadding } from './edit-scores-table-row-padding'
import { initEditScoresWeekNav } from './edit-scores-week-nav'
import { initListSeasonScoreWeeksDates } from './list-season-score-weeks-dates'
import { isExtensionContextValid } from './extension-context'
import { initFloatingUpdateButton } from './floating-update-button'
import { initLoadedBadge } from './loaded-badge'
import { settingsGet } from '../lib/settings-storage'
import { STORAGE_KEYS } from '../lib/storage-keys'

function tryMount(): void {
  if (!isExtensionContextValid()) return
  try {
    settingsGet([STORAGE_KEYS.assistantEnabled], (items) => {
      if (!isExtensionContextValid()) return
      const err = chrome.runtime.lastError
      if (err) {
        console.warn('[Redtooth TD Assistant]', err.message)
        initLoadedBadge()
        initEditScoresTableRowPadding()
        initEditScoresDuplicateRanks()
        initEditScoresRankRowFocus()
        initEditScoresRankHeaderCount()
        initEditScoresWeekNav()
        initEditScoresPlayerArchive()
        initFloatingUpdateButton()
        initAddPlayerDetails()
        initListSeasonScoreWeeksDates()
        return
      }
      initLoadedBadge()
      initEditScoresTableRowPadding()
      initEditScoresDuplicateRanks()
      initEditScoresRankRowFocus()
      initEditScoresRankHeaderCount()
      initListSeasonScoreWeeksDates()
      const enabled = items[STORAGE_KEYS.assistantEnabled]
      if (enabled === false) return
      initEditScoresWeekNav()
      initEditScoresPlayerArchive()
      initFloatingUpdateButton()
      initAddPlayerDetails()
    })
  } catch {
    /* Extension context invalidated (reload) — ignore */
  }
}

if (document.body) {
  tryMount()
} else {
  document.addEventListener('DOMContentLoaded', tryMount, { once: true })
}

export {}
