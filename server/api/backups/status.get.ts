import { getStatus } from '../../services/backupService'

export default defineEventHandler(async () => {
  return getStatus()
})
