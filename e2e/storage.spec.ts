// Nothing is stored in the visitor's browser, and no other host is asked for anything, before the visitor acts (PECR Sch. A1; the
// workspace's docs/legal/STORAGE_LEDGER.md and decision D134). A key a page must write on load would go in `allow`, with a ledger row.
import { defineStorageSuite } from '@meddleware/frontend-config/storage'

defineStorageSuite({ home: '/' })
