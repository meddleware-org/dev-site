import { vueApp } from '@meddleware/frontend-config/eslint'

// The fleet's Vue + TypeScript + accessibility + browser-compat config. The site's pages are Markdown; what is left to lint is its scripts and e2e specs.
export default vueApp({ name: 'dev', ignores: ['**/cache/**', 'docs/.vitepress/generated/**', 'docs/api/**'] })
