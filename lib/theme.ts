/**
 * Club theming — derives a full, contrast-safe token set from the two brand
 * colors stored in `club_config`.
 *
 * Why this exists: pages used to hardcode LeBaron's navy (#152644) and gold
 * (#c9a84c) in 168 places. That is fine for one pilot club and fatal for a
 * multi-club demo — every prospect saw LeBaron's colors wearing their name.
 *
 * The hard part is not swapping two hexes. It is that scraped brand colors are
 * arbitrary: a club whose logo is pale yellow would render white text on pale
 * yellow and be illegible. So every token that carries text is chosen by
 * measured WCAG contrast against its own background rather than assumed.
 *
 * Output is a flat map of CSS custom properties applied once on <html>, so
 * client components can use var(--club-*) with no provider round-trip and no
 * hydration mismatch.
 */

export type RGB = { r: number; g: number; b: number }

/** Parse #rgb / #rrggbb. Returns null on anything malformed. */
export function parseHex(hex: string | null | undefined): RGB | null {
  if (!hex) return null
  const s = hex.trim().replace(/^#/, '')
  if (s.length === 3) {
    const [r, g, b] = s.split('')
    const v = parseInt(r + r + g + g + b + b, 16)
    if (Number.isNaN(v)) return null
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
  }
  if (s.length !== 6) return null
  const v = parseInt(s, 16)
  if (Number.isNaN(v)) return null
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

export function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** WCAG relative luminance (sRGB, gamma-corrected). */
export function luminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1..21. */
export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const NEAR_BLACK: RGB = { r: 15, g: 23, b: 42 } // slate-900, softer than pure black

/**
 * Pick whichever of white / near-black reads better on `bg`.
 * This is the single most important function here: it is what stops a club
 * with a bright or pale brand color from shipping unreadable text.
 */
export function readableOn(bg: RGB): RGB {
  return contrast(bg, WHITE) >= contrast(bg, NEAR_BLACK) ? WHITE : NEAR_BLACK
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RGB {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 }
}

/** Force a color dark enough to serve as a header/app-bar background. */
function ensureDarkEnough(c: RGB, minContrastWithWhite = 4.5): RGB {
  let out = c
  let guard = 0
  while (contrast(out, WHITE) < minContrastWithWhite && guard++ < 40) {
    const hsl = rgbToHsl(out)
    hsl.l = Math.max(0, hsl.l - 0.025)
    out = hslToRgb(hsl)
  }
  return out
}

/** Force a color light/vivid enough to serve as an accent on a dark surface. */
function ensureAccentOn(c: RGB, bg: RGB, minContrast = 3.0): RGB {
  let out = c
  let guard = 0
  const bgIsDark = luminance(bg) < 0.4
  while (contrast(out, bg) < minContrast && guard++ < 40) {
    const hsl = rgbToHsl(out)
    hsl.l = bgIsDark ? Math.min(1, hsl.l + 0.025) : Math.max(0, hsl.l - 0.025)
    // Keep some saturation so it still reads as a brand accent, not grey/white.
    if (hsl.s > 0.12) hsl.s = Math.max(0.12, hsl.s - 0.005)
    out = hslToRgb(hsl)
  }
  return out
}

export type ClubTheme = {
  /** Header / app-bar / primary surface. Always dark enough for white text. */
  primary: string
  /** Text and icons placed on `primary`. */
  onPrimary: string
  /** Accent: active nav, CTAs, stat figures. Always ≥3:1 against `primary`. */
  accent: string
  /** Text placed on a filled `accent` button. */
  onAccent: string
  /** Deeper shade of primary, for drawers and pressed states. */
  primaryDeep: string
  /** Very light primary tint, for selected chips on white cards. */
  primarySoft: string
  /** Page background behind cards. */
  surface: string
  /** Card background. */
  card: string
  /** Muted body text / secondary labels. */
  muted: string
  /** Hairline borders. */
  border: string
}

export const FALLBACK_PRIMARY = '#152644'
export const FALLBACK_ACCENT = '#c9a84c'

/**
 * Build the token set. Accepts whatever the DB holds, including nulls and
 * junk, and always returns something renderable.
 */
export function buildTheme(primaryHex?: string | null, secondaryHex?: string | null): ClubTheme {
  const rawPrimary = parseHex(primaryHex) ?? parseHex(FALLBACK_PRIMARY)!
  const rawAccent = parseHex(secondaryHex) ?? parseHex(FALLBACK_ACCENT)!

  const primary = ensureDarkEnough(rawPrimary)
  const accent = ensureAccentOn(rawAccent, primary)

  // Guard the degenerate case where brand colors are near-identical (a mono
  // logo). Without this the active nav item is invisible against the bar.
  const accentFinal =
    contrast(accent, primary) < 2.5 ? ensureAccentOn(parseHex(FALLBACK_ACCENT)!, primary) : accent

  return {
    primary: toHex(primary),
    onPrimary: toHex(readableOn(primary)),
    accent: toHex(accentFinal),
    onAccent: toHex(readableOn(accentFinal)),
    primaryDeep: toHex(mix(primary, { r: 0, g: 0, b: 0 }, 0.28)),
    primarySoft: toHex(mix(primary, WHITE, 0.9)),
    surface: '#f1f5f9',
    card: '#ffffff',
    muted: '#94a3b8',
    border: '#e2e8f0',
  }
}

/** Map the theme onto the CSS custom properties the UI consumes. */
export function themeCssVars(theme: ClubTheme): Record<string, string> {
  return {
    '--club-primary': theme.primary,
    '--club-on-primary': theme.onPrimary,
    '--club-accent': theme.accent,
    '--club-on-accent': theme.onAccent,
    '--club-primary-deep': theme.primaryDeep,
    '--club-primary-soft': theme.primarySoft,
    '--club-surface': theme.surface,
    '--club-card': theme.card,
    '--club-muted': theme.muted,
    '--club-border': theme.border,
  }
}
