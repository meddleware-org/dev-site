// Smoke test of the BUILT site: it mounts, shows its landmarks (one banner, one main, one footer) and raises no uncaught error.
import { expect, test } from '@playwright/test'
import { PAGES } from './pages.js'
import { page_ } from './open.js'

// One test per page.
for (const [name, path] of Object.entries(PAGES)) {
  // ${name} mounts with its landmarks and without an uncaught error.
  test(`${name} mounts with its landmarks and without an uncaught error`, async ({ page }) => {
    // Uncaught errors the page raises.
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    // Open the page.
    await page_(path)(page)
    // Exactly one of each landmark.
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
    await expect(page.getByRole('banner')).toHaveCount(1)
    expect(errors).toEqual([])
  })
}
