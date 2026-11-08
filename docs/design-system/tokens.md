---
title: "Design tokens"
description: "The @meddleware/design-tokens entry points, the two-layer naming discipline of palette ramps and semantic roles, the scales, seasons and the contrast gate."
---

# Design tokens

`@meddleware/design-tokens` ships four entry points:

| Import | Use |
| --- | --- |
| `@meddleware/design-tokens/tokens.css` | CSS custom properties — **always required** |
| `@meddleware/design-tokens/seasons.css` | Optional seasonal accent overrides |
| `@meddleware/design-tokens/tokens.json` | Raw JSON token tree for tooling |
| `@meddleware/design-tokens` (JS) | TypeScript re-export of the token tree |

## Two-layer naming discipline

**Layer 1 — palette/ramp (colour-named):** These are the raw hue swatches. Components never reference them directly.

```css
--mw-red-500   --mw-red-300   --mw-red-600
--mw-blue-500  --mw-blue-300
--mw-yellow-400  --mw-green-500
/* …and legacy brand ramps: --mw-oxblood-*, --mw-indigo-*, --mw-gold-* */
```

**Layer 2 — semantic roles (colour-agnostic):** What your components and apps should use. Revaluing them later never requires renaming.

```css
--accent          /* primary action (red) */
--secondary       /* secondary action (blue) */
--warning         /* caution/advisory (yellow) */
--ok              /* success/positive (green) */
--danger          /* error/destructive (red) */
--info            /* informational (blue) */
--focus-ring      /* keyboard focus indicator */
--highlight       /* text emphasis (yellow) */
--bg  --surface  --text  --muted  --lift
--border          /* dividers and decoration only (1.3–1.4:1) */
--control-border  /* the edge of a text field, textarea or select: 3:1 on every canvas (WCAG 1.4.11) */
```

**Contrast is gated.** `npm run check:contrast` in the package measures every role pairing in all ten theme × season looks: text and labels at 7:1 (WCAG AAA) on `--bg`, `--surface` and `--lift`; the focus ring, `--control-border` and the graphical fills at 3:1. A new semantic role fails the gate unless a pairing measures it (or it is listed as exempt with a reason). Use `--warning-text` for text in the warning tone; `--warning` is a fill.

## Sacred-geometry scales

All spacing and type sizes are derived from the golden ratio (φ = 1.618) via `calc()`. Nothing is a magic number.

### Spacing (Fibonacci)

```css
--space-4xs:  0.125rem  /* 2px — hairline gaps (half a unit) */
--space-3xs:  0.25rem   /* 4px  */
--space-2xs:  0.5rem    /* 8px  */
--space-xs:   0.75rem   /* 12px */
--space-sm:   1.25rem   /* 20px */
--space-md:   2rem      /* 32px */
--space-lg:   3.25rem   /* 52px */
--space-xl:   5.25rem   /* 84px */
--space-2xl:  8.5rem    /* 136px */
--space-3xl:  13.75rem  /* 220px */
```

### Type scale (φ-derived modular)

```css
--font-size-xs:    ≈ 0.618rem   /* base ÷ φ */
--font-size-2xs:   ≈ 0.702rem   /* between xs and sm: console density */
--font-size-sm:    ≈ 0.786rem   /* base ÷ φ^½ */
--font-size-base:  1rem
--font-size-md:    ≈ 1.272rem   /* base × φ^½ */
--font-size-lg:    ≈ 1.618rem   /* base × φ */
--font-size-xl:    ≈ 2.058rem
--font-size-2xl:   ≈ 2.618rem   /* base × φ² */
--font-size-3xl:   ≈ 3.33rem
```

Also `--leading-tight|normal|relaxed|loose`, `--tracking-tight|normal|wide`, and the weights `--font-weight-regular` (400), `-medium` (500), `-semibold` (600), `-brand` (650), `-bold` (700).

### Ratios and splits

```css
--ratio-phi:      1.618
--ratio-phi-inv:  0.618
--ratio-phi-root: 1.272
--split-major:    61.8%   /* φ-split: use for hero/content layouts */
--split-minor:    38.2%
```

## Seasonal theming

Import `seasons.css` and set `data-season` on `<html>` (or any ancestor). The season overrides accent, highlight, status tints, and a faint background tint. Dark mode composes independently.

```ts
// Enable seasonal theming
import '@meddleware/design-tokens/seasons.css'
```

```html
<!-- Spring: green/yellow accents -->
<html data-season="spring">

<!-- Summer: bright blue/red -->
<html data-season="summer">

<!-- Autumn: orange/amber -->
<html data-season="autumn">

<!-- Winter: cool blue/desaturated -->
<html data-season="winter">
```

Seasons compose with `data-theme`:

```html
<html data-theme="dark" data-season="winter">
```

To override a single role while keeping seasonal fallback:

```css
/* In your app's CSS — defines --season-accent for the current season scope */
:root {
  --season-accent: #0066cc;  /* overrides the spring/summer/etc. accent locally */
}
```

Not importing `seasons.css` is a valid opt-out — every role uses its light/dark primary fallback silently. No console warnings.

## Chaos and motion tokens

```css
--noise-overlay     /* SVG noise layer (use with .mw-noise utility class) */
--noise-opacity: 0.035
--hero-offset       /* φ-derived horizontal offset for intentional asymmetry */
--gap-irregular     /* slightly non-uniform gap for human presence */
--duration-fast: 100ms   --duration-base: 140ms   --duration-slow: 320ms
--ease-human: cubic-bezier(0.2, 0, 0.2, 1)
--transition-base: var(--duration-base) var(--ease-human)
--transition-slow: var(--duration-slow) var(--ease-human)
```

## Shape, depth and layering

```css
--radius-xs: 2px   --radius-sm: 6px   --radius: 10px   --radius-lg: 16px
--shadow-1  --shadow-2  --shadow-3     /* resting card, raised popover, modal dialog (theme-only: they never vary by season) */
--backdrop                              /* the layer behind a modal dialog */
--z-below: -1   --z-raised: 1   --z-header: 50   --z-popover: 60   --z-dialog: 70   --z-skip: 100
--mw-content-narrow: 26rem   --mw-content-prose: 65ch
--mw-header-height: 56px     --mw-sidebar-width: 240px
```

The package's `check:css` gate holds `tokens.css` and `seasons.css` to custom properties only (plus `color-scheme`): no rule, no `@import`, no `content`, and one pinned `url()` (the noise overlay), so a compromised release cannot restyle an app.

## TypeScript / JSON usage

```ts
import { primary, ratio, space, semantic } from '@meddleware/design-tokens'

console.log(primary.red[500])    // "#d92d20"
console.log(ratio.phi)           // 1.618
console.log(space.md)            // "2rem"
console.log(semantic.dark.accent) // "#e79475"
```
