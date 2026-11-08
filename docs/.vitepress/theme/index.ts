// The Meddleware theme: the default VitePress theme mapped onto the design tokens, with the footer and the landmark fixes, plus the one
// component the pages use to say which networks the platform is live on.
import MeddlewareTheme from '@meddleware/vitepress-theme'
import type { Theme } from 'vitepress'
import NetworkNotice from './NetworkNotice.vue'

const theme: Theme = {
  extends: MeddlewareTheme,
  enhanceApp({ app }) {
    app.component('NetworkNotice', NetworkNotice)
  },
}

export default theme
