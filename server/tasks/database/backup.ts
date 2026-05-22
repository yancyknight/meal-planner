import { runBackup } from '../../services/backupService'

export default defineTask({
  meta: {
    name: 'database:backup',
    description: 'Hot-backup SQLite database and prune old backups',
  },
  async run() {
    await runBackup()
    return { result: 'Database backup complete' }
  },
})
