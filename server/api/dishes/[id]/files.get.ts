import { listFilesForDish } from '../../../services/dishFileService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  return listFilesForDish(id)
})
