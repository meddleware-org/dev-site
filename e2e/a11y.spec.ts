// The shared accessibility sweep over the site's pages: WCAG 2.2 AA and AAA in every colour mode × season, reflow (the navigation moves
// behind the menu button), text size, forced colours, reduced motion and the keyboard.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { PAGES } from './pages.js'
import { page_ } from './open.js'

defineA11ySuite(Object.fromEntries(Object.entries(PAGES).map(([name, path]) => [name, page_(path)])), { aaa: 'gate' })
