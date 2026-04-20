/**
 * UK (en-GB) display formats for ISO dates (yyyy-mm-dd) on List Season Score Weeks.
 */

export const WEEK_COMMENCING_DATE_FORMAT_IDS = [
  'iso',
  'ddMMyyyy',
  'ddMMyy',
  'dMMMyyyy',
  'ddMMMyyyy',
  'dMMMMyyyy',
  'ddMMMMyyyy',
  'EEE_d_MMM_yyyy',
  'EEEE_comma_d_MMMM_yyyy',
] as const

export type WeekCommencingDateFormatId =
  (typeof WEEK_COMMENCING_DATE_FORMAT_IDS)[number]

const ID_SET = new Set<string>(WEEK_COMMENCING_DATE_FORMAT_IDS)

export function isWeekCommencingDateFormatId(
  v: unknown,
): v is WeekCommencingDateFormatId {
  return typeof v === 'string' && ID_SET.has(v)
}

/** Maps removed duplicate ids; use with storage values that may predate the trim. */
export function coerceWeekCommencingDateFormatId(
  raw: unknown,
  fallback: WeekCommencingDateFormatId,
): WeekCommencingDateFormatId {
  if (raw === 'EEEE_d_MMMM_yyyy') return 'EEEE_comma_d_MMMM_yyyy'
  if (isWeekCommencingDateFormatId(raw)) return raw
  return fallback
}

const ISO_FULL = /^(\d{4})-(\d{2})-(\d{2})$/

/** Single ISO date in yyyy-mm-dd form. */
export function formatWeekCommencingDate(
  isoYmd: string,
  id: WeekCommencingDateFormatId,
): string {
  const t = isoYmd.trim()
  if (id === 'iso') return t
  const m = ISO_FULL.exec(t)
  if (!m) return isoYmd
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const date = new Date(y, mo, d)
  if (Number.isNaN(date.getTime())) return isoYmd

  const gb = (opts: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat('en-GB', opts).format(date)

  switch (id) {
    case 'ddMMyyyy':
      return gb({ day: '2-digit', month: '2-digit', year: 'numeric' })
    case 'ddMMyy':
      return gb({ day: '2-digit', month: '2-digit', year: '2-digit' })
    case 'dMMMyyyy':
      return gb({ day: 'numeric', month: 'short', year: 'numeric' })
    case 'ddMMMyyyy':
      return gb({ day: '2-digit', month: 'short', year: 'numeric' })
    case 'dMMMMyyyy':
      return gb({ day: 'numeric', month: 'long', year: 'numeric' })
    case 'ddMMMMyyyy':
      return gb({ day: '2-digit', month: 'long', year: 'numeric' })
    case 'EEE_d_MMM_yyyy': {
      const weekday = gb({ weekday: 'short' })
      const rest = gb({ day: 'numeric', month: 'short', year: 'numeric' })
      return `${weekday}, ${rest}`
    }
    case 'EEEE_comma_d_MMMM_yyyy': {
      const weekday = gb({ weekday: 'long' })
      const rest = gb({ day: 'numeric', month: 'long', year: 'numeric' })
      return `${weekday}, ${rest}`
    }
    default:
      return t
  }
}

/**
 * yyyy-mm-dd for a given weekday within the Redtooth week (Sun–Sat) that contains `ref`.
 * `dayOfWeek`: 0 = Sunday … 6 = Saturday (JavaScript `Date#getDay()`).
 */
export function getIsoWeekDateForDayOfWeek(
  ref: Date = new Date(),
  dayOfWeek: number,
): string {
  const dow = ((dayOfWeek % 7) + 7) % 7
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const startSunday = x.getDay()
  x.setDate(x.getDate() - startSunday)
  x.setDate(x.getDate() + dow)
  const y = x.getFullYear()
  const mo = x.getMonth() + 1
  const d = x.getDate()
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * yyyy-mm-dd for the Sunday that starts the Redtooth week (Sun–Sat) containing `ref`.
 */
export function getIsoWeekSundayYmd(ref: Date = new Date()): string {
  return getIsoWeekDateForDayOfWeek(ref, 0)
}

/** Local calendar date as yyyy-mm-dd (no time zone shift). */
export function getLocalCalendarDateYmd(ref: Date = new Date()): string {
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const y = x.getFullYear()
  const mo = x.getMonth() + 1
  const d = x.getDate()
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Redtooth’s cell value is treated as a date in the Sun–Sat week; we normalise to that
 * week’s Sunday, then move to the venue’s game day (0 = Sun … 6 = Sat).
 */
export function shiftWeekCommencingToVenuePlayDay(
  isoYmd: string,
  playDayOfWeek: number,
): string {
  const t = isoYmd.trim()
  const m = ISO_FULL.exec(t)
  if (!m) return isoYmd
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const x = new Date(y, mo, d)
  if (Number.isNaN(x.getTime())) return isoYmd
  const startSunday = x.getDay()
  x.setDate(x.getDate() - startSunday)
  const dow = ((playDayOfWeek % 7) + 7) % 7
  x.setDate(x.getDate() + dow)
  const y2 = x.getFullYear()
  const mo2 = x.getMonth() + 1
  const d2 = x.getDate()
  return `${y2}-${String(mo2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`
}

/** Preview / options: example date for format dropdown (today vs venue game day in current Redtooth week). */
export function getListSeasonScoreWeeksFormatExampleIsoYmd(
  venuePlayDayEnabled: boolean,
  playDayOfWeek: number,
  ref: Date = new Date(),
): string {
  if (venuePlayDayEnabled) {
    return getIsoWeekDateForDayOfWeek(ref, playDayOfWeek)
  }
  return getLocalCalendarDateYmd(ref)
}

const FORMAT_OPTION_SUFFIX: Record<WeekCommencingDateFormatId, string> = {
  iso: 'Website default (yyyy-mm-dd)',
  ddMMyyyy: 'dd/mm/yyyy',
  ddMMyy: 'dd/mm/yy',
  dMMMyyyy: 'd mmm yyyy',
  ddMMMyyyy: 'dd mmm yyyy',
  dMMMMyyyy: 'd mmmm yyyy',
  ddMMMMyyyy: 'dd mmmm yyyy',
  EEE_d_MMM_yyyy: 'short weekday, d mmm yyyy',
  EEEE_comma_d_MMMM_yyyy: 'weekday, d mmmm yyyy',
}

/** Options-page dropdown label: formatted example — pattern description. */
export function getWeekCommencingFormatOptionLabel(
  id: WeekCommencingDateFormatId,
  exampleIsoYmd: string,
): string {
  const example = formatWeekCommencingDate(exampleIsoYmd, id)
  return `${example} — ${FORMAT_OPTION_SUFFIX[id]}`
}
