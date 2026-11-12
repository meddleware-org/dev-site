// The built site carries the company mark and nothing third-party (the theme does the brand work; maintainer decisions 2026-11-08):
// the favicon set and web manifest, one svg icon link per page, the mark in the nav bar, no web fonts, and no external script, style or image.
// Skipped when dist/ is absent (a plain `npm test`); CI runs it after the build with REQUIRE_DIST=1, which turns an absent dist into a failure.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dist = join(import.meta.dirname, '..', 'dist')
const present = existsSync(join(dist, 'index.html'))
const required = process.env.REQUIRE_DIST === '1'

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))

describe.skipIf(!present && !required)('the built site (dist/)', () => {
  it('exists when it is required', () => {
    expect(present, 'dist/ is missing: run `npm run build` first').toBe(true)
  })

  const files = present ? walk(dist) : []
  const pages = files.filter((f) => f.endsWith('.html'))

  it('ships the favicon set and the web manifest', () => {
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
      expect(existsSync(join(dist, f)), f).toBe(true)
    }
    const manifest = JSON.parse(readFileSync(join(dist, 'site.webmanifest'), 'utf8'))
    expect(manifest.name).toBe('Meddleware Dev')
    expect(manifest.icons.map((i) => i.src)).toEqual(expect.arrayContaining(['/icon-192.png', '/icon-512.png', '/favicon.svg']))
  })

  it('has exactly one svg icon link, the manifest and the touch icon on every page', () => {
    expect(pages.length).toBeGreaterThan(10)
    for (const page of pages) {
      const html = readFileSync(page, 'utf8')
      const svgIcons = html.match(/<link rel="icon"[^>]*type="image\/svg\+xml"[^>]*>/g) ?? []
      expect(svgIcons, page).toHaveLength(1)
      expect(html, page).toContain('<link rel="manifest" href="/site.webmanifest">')
      expect(html, page).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
    }
  })

  it('shows the mark in the nav bar', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    const title = html.slice(html.indexOf('VPNavBarTitle'))
    expect(title.slice(0, title.indexOf('</a>'))).toMatch(/<svg class="mw-brand-mark[^"]*"[^>]*aria-hidden="true"/)
  })

  it('has no web fonts and no font preload', () => {
    expect(files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([])
    for (const page of pages) expect(readFileSync(page, 'utf8'), page).not.toMatch(/<link[^>]*as="font"/)
    for (const css of files.filter((f) => f.endsWith('.css'))) expect(readFileSync(css, 'utf8'), css).not.toMatch(/@font-face/)
  })

  it('loads no script, style, image or font from another origin', () => {
    const external = /^(?:https?:)?\/\//
    for (const page of pages) {
      const html = readFileSync(page, 'utf8')
      const sources = [
        ...[...html.matchAll(/<(?:script|img|source|iframe)\b[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/<link\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]),
      ]
      expect(sources.filter((s) => external.test(s)), page).toEqual([])
    }
    for (const css of files.filter((f) => f.endsWith('.css'))) {
      expect(readFileSync(css, 'utf8'), css).not.toMatch(/(?:@import\s+|url\(\s*["']?)(?:https?:)?\/\//)
    }
  })
})
