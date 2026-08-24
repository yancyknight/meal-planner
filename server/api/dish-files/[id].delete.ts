import { deleteDishFile } from '../../services/dishFileService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid file ID' }
  }

  const deleted = await deleteDishFile(id)
  if (!deleted) {
    setResponseStatus(event, 404)
    return { error: 'File not found' }
  }

  setResponseStatus(event, 204)
  return null
})
