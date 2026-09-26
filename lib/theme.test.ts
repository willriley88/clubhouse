/**
 * Contrast guarantees for the club theme.
 *
 * These are the tests that matter commercially: every club we theme is
 * branded from a *scraped* logo, so the input colors are arbitrary and
 * occasionally awful. A demo that ships white text on pale yellow is worse
 * than a demo that ships the default navy. The invariants below are what let
 * us generate themes for hundreds of clubs without eyeballing each one.
 *
 * Run: npx tsx lib/theme.test.ts   (or via `npm run test:theme`)
 */
import assert from 'node:assert/strict'
import { buildTheme, parseHex, contrast, luminance } from './theme'

let passed = 0
let failed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (err) {
    failed++
    console.error(`  FAIL  ${name}`)
    console.error(`        ${(err as Error).message.split('\n')[0]}`)
  }
}

// Real colors extracted from club logos in golf-db-product, plus deliberately
// hostile inputs. The pale/neon cases are the ones that break naive theming.
const CASES: Array<[string, string | null, string | null]> = [
  ['LeBaron Hills (pilot)', '#152644', '#c9a84c'],
  ['Brockton CC', '#183018', null],
  ['Thorny Lea GC', '#d80060', null],
  ['Milton-Hoosic', '#184878', null],
  ['Fall River CC', '#001830', null],
  ['Hopkinton CC', '#304848', null],
  ['Sharon CC', '#901830', null],
  ['Reservation GC', '#a80018', null],
  ['pale yellow logo', '#f5f0a0', '#fffde0'],
  ['neon green logo', '#00ff00', '#7fff00'],
  ['pure white logo', '#ffffff', '#fefefe'],
  ['pure black logo', '#000000', '#0a0a0a'],
  ['mono navy (identical pair)', '#152644', '#152644'],
  ['null / missing', null, null],
  ['garbage input', 'not-a-color', '###'],
  ['shorthand hex', '#1a4', '#fc0'],
]

console.log('\nclub theme — contrast invariants\n')

for (const [label, primary, secondary] of CASES) {
  const t = buildTheme(primary, secondary)
  const P = parseHex(t.primary)!
  const A = parseHex(t.accent)!
  const onP = parseHex(t.onPrimary)!
  const onA = parseHex(t.onAccent)!

  const cText = contrast(P, onP)
  const cAccent = contrast(A, P)
  const cBtn = contrast(A, onA)

  // WCAG AA for normal body text.
  check(`${label}: header text ≥ 4.5:1`, () =>
    assert.ok(cText >= 4.5, `got ${cText.toFixed(2)}:1 (${t.primary} vs ${t.onPrimary})`)
  )
  // WCAG AA for large text / UI components — accent on the header bar.
  check(`${label}: accent on header ≥ 3:1`, () =>
    assert.ok(cAccent >= 3.0, `got ${cAccent.toFixed(2)}:1 (${t.accent} vs ${t.primary})`)
  )
  // Label on a filled accent button.
  check(`${label}: accent button label ≥ 4.5:1`, () =>
    assert.ok(cBtn >= 4.5, `got ${cBtn.toFixed(2)}:1 (${t.accent} vs ${t.onAccent})`)
  )
  // The header must actually read as dark — a white header with dark text is
  // a different app, not a themed one.
  check(`${label}: header is a dark surface`, () =>
    assert.ok(luminance(P) < 0.45, `luminance ${luminance(P).toFixed(3)} for ${t.primary}`)
  )

  console.log(
    `  ${label.padEnd(28)} primary ${t.primary}  accent ${t.accent}  ` +
    `text ${cText.toFixed(1)}:1  accent ${cAccent.toFixed(1)}:1`
  )
}

// Determinism: theming runs on every request; it must not drift.
check('deterministic', () => {
  const a = buildTheme('#183018', null)
  const b = buildTheme('#183018', null)
  assert.deepEqual(a, b)
})

// Malformed input must degrade to the documented fallback, never throw.
check('garbage input falls back without throwing', () => {
  const t = buildTheme('zzz', 'qqq')
  assert.equal(t.primary, '#152644')
})

console.log(`\n  ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
