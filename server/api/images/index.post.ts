import { saveImage } from '../../services/imageService'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    setResponseStatus(event, 400)
    return { error: 'No file provided' }
  }

  const filePart = parts.find(p => p.name === 'file' || p.type?.startsWith('image/'))
  if (!filePart || !filePart.data) {
    setResponseStatus(event, 400)
    return { error: 'No image file found in request' }
  }

  const filename = await saveImage(filePart.data, filePart.filename ?? 'upload.jpg')
  return { filename }
})
