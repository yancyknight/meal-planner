import { cleanupExpired } from '../../services/pendingRecipeImportService'

export default defineTask({
  meta: {
    name: 'recipe-import:cleanup-pending',
    description: 'Delete expired pending bookmarklet recipe imports',
  },
  async run() {
    const deleted = await cleanupExpired()
    return { result: `Deleted ${deleted} expired pending recipe import(s)` }
  },
})
