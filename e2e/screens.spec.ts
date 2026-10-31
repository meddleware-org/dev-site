// Screenshots for LOOKING at the site (see @meddleware/frontend-config/shots). Run: npm run shots (after npm run build).
import { defineShots } from '@meddleware/frontend-config/shots'
import { PAGES } from './pages.js'
import { page_ } from './open.js'

defineShots(Object.fromEntries(Object.entries(PAGES).map(([name, path]) => [name, page_(path)])))
