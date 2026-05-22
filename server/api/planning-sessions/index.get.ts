import { listPlanningSessions } from '../../services/planningSessionService'

export default defineEventHandler(async () => {
  return listPlanningSessions()
})
