import { runExpiryCheck, runAuditOverdueCheck } from '../../services/freezerNotificationService'

export default defineTask({
  meta: {
    name: 'freezer:expiry-check',
    description: 'Notify on newly expiring freezer items and audit-overdue freezers',
  },
  async run() {
    await runExpiryCheck()
    await runAuditOverdueCheck()
    return { result: 'Freezer expiry check complete' }
  },
})
