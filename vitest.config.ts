import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Unit tests live in tests/; the browser tests in e2e/ are Playwright's. The Vue plugin compiles the one theme component the tests render.
export default defineConfig({ plugins: [vue()], test: { include: ['tests/**/*.test.{mjs,ts}'], exclude: ['node_modules/**'] } })
