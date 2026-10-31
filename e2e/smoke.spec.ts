// Smoke test of the BUILT site: it mounts, shows its landmarks (one banner, one main, one footer) and raises no uncaught error.
import { expect, test } from '@playwright/test'
import { PAGES } from './pages.js'
import { page_ } from './open.js'

for (const [name, path] of Object.entries(PAGES)) {
  test(`${name} mounts with its landmarks and without an uncaught error`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page_(path)(page)
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('contentinfo')).toHaveCount(1)
    await expect(page.getByRole('banner')).toHaveCount(1)
    expect(errors).toEqual([])
  })
}
