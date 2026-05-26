import { listFreezers } from '../../services/freezerService'

export default defineEventHandler(async () => {
  return listFreezers()
})
