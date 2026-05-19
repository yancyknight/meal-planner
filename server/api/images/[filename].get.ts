import { readImageFile } from '../../services/imageService'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    setResponseStatus(event, 400)
    return { error: 'Filename required' }
  }

  try {
    const { buffer, mimeType } = await readImageFile(filename)
    setResponseHeader(event, 'Content-Type', mimeType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return buffer
  }
  catch {
    setResponseStatus(event, 404)
    return { error: 'Image not found' }
  }
})
