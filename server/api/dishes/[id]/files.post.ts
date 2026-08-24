import { addFileToDish } from '../../../services/dishFileService'
import { getMaxUploadBytes } from '../../../services/fileService'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid dish ID' }
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'file' && p.filename)
  if (!filePart?.data || !filePart.filename) {
    setResponseStatus(event, 400)
    return { error: 'No file provided' }
  }

  const result = await addFileToDish(id, filePart.data, filePart.filename, filePart.type ?? '')

  if (!result.ok) {
    switch (result.reason) {
      case 'dish-not-found':
        setResponseStatus(event, 404)
        return { error: 'Dish not found' }
      case 'too-large':
        setResponseStatus(event, 413)
        return { error: `File is too large. Maximum size is ${Math.floor(getMaxUploadBytes() / (1024 * 1024))} MB.` }
      case 'type-not-allowed':
        setResponseStatus(event, 400)
        return { error: 'That file type is not supported.' }
      default:
        setResponseStatus(event, 400)
        return { error: 'Invalid file.' }
    }
  }

  setResponseStatus(event, 201)
  return result.file
})
