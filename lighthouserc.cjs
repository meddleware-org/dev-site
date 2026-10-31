// Lighthouse CI on the built site: accessibility 100, best practices >= 0.95, SEO and performance floors (free, results to
// test-results/lighthouse). (.cjs because Lighthouse CI loads its config with `require`; Node loads the ES module factory through it.)
const { lighthouseConfig } = require('@meddleware/frontend-config/lighthouserc')

module.exports = lighthouseConfig({
  port: 4295,
  paths: ['/', '/design-system/'],
  startServerCommand: 'npx vitepress preview docs --port 4295',
})
