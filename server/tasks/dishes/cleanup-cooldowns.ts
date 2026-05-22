import { cleanup } from '../../services/dishCooldownService'

export default defineTask({
  meta: {
    name: 'dishes:cleanup-cooldowns',
    description: 'Delete expired one-off dish cooldown records',
  },
  async run() {
    await cleanup()
    return { result: 'Expired dish cooldowns cleaned up' }
  },
})
