/** Default highlight colour (red) for required-field tint. */
export const DEFAULT_ADD_PLAYER_HIGHLIGHT_HEX = '#ff0000'

/** Default opacity of the tint (10%). */
export const DEFAULT_ADD_PLAYER_HIGHLIGHT_OPACITY = 0.1

/** Minimum stored opacity (10%). */
export const MIN_ADD_PLAYER_HIGHLIGHT_OPACITY = 0.1

/** Maximum stored opacity (50%). */
export const MAX_ADD_PLAYER_HIGHLIGHT_OPACITY = 0.5

export function normalizeAddPlayerHighlightHex(input: unknown): string {
  if (typeof input !== 'string') return DEFAULT_ADD_PLAYER_HIGHLIGHT_HEX
  const s = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return `#${s.toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return (
      `#${s
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()}`
    )
  }
  return DEFAULT_ADD_PLAYER_HIGHLIGHT_HEX
}

export function normalizeAddPlayerHighlightOpacity(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.min(
      MAX_ADD_PLAYER_HIGHLIGHT_OPACITY,
      Math.max(MIN_ADD_PLAYER_HIGHLIGHT_OPACITY, input),
    )
  }
  if (typeof input === 'string' && input.trim() !== '') {
    const n = Number.parseFloat(input)
    if (Number.isFinite(n)) {
      return Math.min(
        MAX_ADD_PLAYER_HIGHLIGHT_OPACITY,
        Math.max(MIN_ADD_PLAYER_HIGHLIGHT_OPACITY, n),
      )
    }
  }
  return DEFAULT_ADD_PLAYER_HIGHLIGHT_OPACITY
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = normalizeAddPlayerHighlightHex(hex).replace(/^#/, '')
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
