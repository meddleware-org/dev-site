import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'

/** A page of the built site, with every request that leaves localhost refused. */
export const page_ =
  (path: string) =>
  async (page: Page): Promise<void> => {
    await offline(page)
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
  }
