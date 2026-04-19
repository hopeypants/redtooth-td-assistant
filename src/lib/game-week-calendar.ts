/**
 * League structure: 4 seasons × 13 weeks = 52 weeks per league year.
 * Redtooth week IDs: 2026/27 Season 1 Week 1 = #997 (k = 0).
 * Calendar anchor: S1W1 week starts Sunday 18 Jan 2026 (local); S2W1 ≈ Sunday 19 Apr 2026 → #1010.
 */

export const BASE_WEEK_ID = 997
export const WEEKS_PER_SEASON = 13
export const SEASONS_PER_LEAGUE_YEAR = 4
export const WEEKS_PER_LEAGUE_YEAR = WEEKS_PER_SEASON * SEASONS_PER_LEAGUE_YEAR

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/** First moment of 2026/27 S1W1 (Sunday 18 Jan 2026, local midnight). */
export function anchorDate(): Date {
  return new Date(2026, 0, 18, 0, 0, 0, 0)
}

/** Signed week index from anchor (0 = S1W1 of 2026/27). */
export function weekIndexFromDate(d: Date): number {
  return Math.floor((d.getTime() - anchorDate().getTime()) / MS_PER_WEEK)
}

export function decodeWeekIndex(k: number): {
  yearOffset: number
  season: number
  week: number
} {
  const yearOffset = Math.floor(k / WEEKS_PER_LEAGUE_YEAR)
  const rem = k - yearOffset * WEEKS_PER_LEAGUE_YEAR
  const season = Math.floor(rem / WEEKS_PER_SEASON) + 1
  const week = (rem % WEEKS_PER_SEASON) + 1
  return { yearOffset, season, week }
}

/** Linear season index (0 = 2026/27 S1, … 3 = 2026/27 S4, 4 = 2027/28 S1). */
export function seasonIndexFromDate(d: Date): number {
  const k = weekIndexFromDate(d)
  const { yearOffset, season } = decodeWeekIndex(k)
  return yearOffset * SEASONS_PER_LEAGUE_YEAR + (season - 1)
}

export function seasonIndexToYearSeason(
  seasonIndex: number,
): { yearOffset: number; season: number } {
  const yearOffset = Math.floor(seasonIndex / SEASONS_PER_LEAGUE_YEAR)
  const season = seasonIndex - yearOffset * SEASONS_PER_LEAGUE_YEAR + 1
  return { yearOffset, season }
}

export function leagueYearLabel(yearOffset: number): string {
  const start = 2026 + yearOffset
  const endTwo = (start + 1) % 100
  return `${start}/${endTwo.toString().padStart(2, '0')}`
}

export function encodeWeekId(
  yearOffset: number,
  season: number,
  week: number,
): number {
  return (
    BASE_WEEK_ID +
    yearOffset * WEEKS_PER_LEAGUE_YEAR +
    (season - 1) * WEEKS_PER_SEASON +
    (week - 1)
  )
}

export function decodeWeekId(id: number): {
  yearOffset: number
  season: number
  week: number
} {
  const k = id - BASE_WEEK_ID
  return decodeWeekIndex(k)
}
