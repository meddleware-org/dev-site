import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// Browser tests of the BUILT VitePress site (`vitepress preview`; the repo's `test:e2e` script builds first): Chromium locally, all five
// browser projects in CI (E2E_BROWSERS=all to run them locally). Every request that leaves localhost is refused in the specs. The screenshot
// capture (`npm run shots`) is for looking, not asserting.
export default definePlaywrightConfig({ port: 4295, kind: 'vitepress' })
