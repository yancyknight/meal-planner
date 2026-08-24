import { getDishFile, readDishFileContents } from '../../../services/dishFileService'
import { isInlineSafe } from '../../../../shared/schemas/dishFile'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid file ID' }
  }

  const file = await getDishFile(id)
  if (!file) {
    setResponseStatus(event, 404)
    return { error: 'File not found' }
  }

  let buffer: Buffer
  try {
    buffer = await readDishFileContents(file)
  }
  catch {
    setResponseStatus(event, 404)
    return { error: 'File not found' }
  }

  // Anything not on the inline-safe list is served as an opaque download, so a
  // stored html/svg can never execute against this origin.
  const inline = isInlineSafe(file.mimeType)
  const disposition = inline ? 'inline' : 'attachment'
  const filename = file.originalName.replace(/["\\\r\n]/g, '_')

  setResponseHeader(event, 'Content-Type', inline ? file.mimeType : 'application/octet-stream')
  setResponseHeader(
    event,
    'Content-Disposition',
    `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
  )
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  return buffer
})
