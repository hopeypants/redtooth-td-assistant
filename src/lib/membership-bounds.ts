/** Smallest positive integer with exactly `digitCount` decimal digits (e.g. 5 → 10000). */
export function minIntFullDigits(digitCount: number): number {
  const d = Math.min(20, Math.max(1, Math.floor(digitCount)))
  return 10 ** (d - 1)
}

/** Largest integer with exactly `digitCount` decimal digits (e.g. 5 → 99999). */
export function maxIntFullDigits(digitCount: number): number {
  const d = Math.min(20, Math.max(1, Math.floor(digitCount)))
  return Math.min(10 ** d - 1, Number.MAX_SAFE_INTEGER)
}
