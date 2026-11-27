// Vitest configuration for the unit tests (`npm test`), with a long timeout for the sample type-check.
// The Vue plugin, which compiles the one theme component the tests render.
import vue from '@vitejs/plugin-vue'
// Vitest's typed configuration helper.
import { defineConfig } from 'vitest/config'

// Unit tests live in tests/; the browser tests in e2e/ are Playwright's. The Vue plugin compiles the one theme component the tests render.
// Unit tests in tests/; the browser tests in e2e/ are Playwright's.
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.{mjs,ts}'],
    exclude: ['node_modules/**'],
    // The sample test runs the TypeScript compiler over every guide; under the parallel workers of a small machine that outlasts the 5 s default.
    testTimeout: 60_000,
  },
})
