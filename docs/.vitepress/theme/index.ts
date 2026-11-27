// The Meddleware theme: the default VitePress theme mapped onto the design tokens, with the footer and the landmark fixes, plus the one
// component the pages use to say which networks the platform is live on.
// The shared Meddleware theme.
import MeddlewareTheme from '@meddleware/vitepress-theme'
// VitePress's theme type.
import type { Theme } from 'vitepress'
// The one component the pages use.
import NetworkNotice from './NetworkNotice.vue'

// This site's theme: the shared one plus the notice.
const theme: Theme = {
  // Start from the shared theme.
  extends: MeddlewareTheme,
  // Register the notice so any page can use `<NetworkNotice />`.
  enhanceApp({ app }) {
    app.component('NetworkNotice', NetworkNotice)
  },
}

// VitePress reads the theme from the default export.
export default theme
