import { getPlannerHints, getStandaloneHints } from '../../services/freezerItemService'

export default defineEventHandler(async () => {
  const [hints, standaloneHints] = await Promise.all([
    getPlannerHints(),
    getStandaloneHints(),
  ])
  return { hints, standaloneHints }
})
