import { defineConfig } from 'vitest/config'

// Unit tests live in tests/; the browser tests in e2e/ are Playwright's.
export default defineConfig({ test: { include: ['tests/**/*.test.{mjs,ts}'], exclude: ['node_modules/**'] } })
