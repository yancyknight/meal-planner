import { z } from 'zod'

/**
 * Default upload ceiling. The server may lower or raise it with MAX_UPLOAD_MB —
 * the server value is authoritative, this one drives the client-side pre-check
 * so an oversized file fails before it is sent.
 */
export const DEFAULT_MAX_UPLOAD_MB = 100
export const MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024

/**
 * Extension allowlist. Each entry lists the MIME types a browser is expected to
 * report for that extension. Uploads must match on extension; the reported MIME
 * must either be in the list or be one of the generic types below (browsers and
 * OSes frequently send octet-stream for markdown, heic, and Office formats).
 */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  heic: ['image/heic', 'image/heif'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  rtf: ['application/rtf', 'text/rtf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  odt: ['application/vnd.oasis.opendocument.text'],
  ods: ['application/vnd.oasis.opendocument.spreadsheet'],
}

/** Reported MIME types that carry no information — fall back to the extension. */
const GENERIC_MIME_TYPES = ['', 'application/octet-stream', 'binary/octet-stream']

/** `accept` attribute value for a file input. */
export const FILE_ACCEPT_ATTR = Object.keys(ALLOWED_FILE_TYPES).map(ext => `.${ext}`).join(',')

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx < 0 || idx === filename.length - 1) return ''
  return filename.slice(idx + 1).toLowerCase()
}

export function isAllowedUpload(mimeType: string, filename: string): boolean {
  const allowedMimes = ALLOWED_FILE_TYPES[extensionOf(filename)]
  if (!allowedMimes) return false
  const mime = mimeType.split(';')[0]!.trim().toLowerCase()
  return GENERIC_MIME_TYPES.includes(mime) || allowedMimes.includes(mime)
}

/**
 * MIME types safe to render in the browser tab. Everything else — notably
 * html and svg, which would execute same-origin — is served as a download.
 */
const INLINE_SAFE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'text/plain',
]

export function isInlineSafe(mimeType: string): boolean {
  return INLINE_SAFE_MIME_TYPES.includes(mimeType.split(';')[0]!.trim().toLowerCase())
}

/** Validated metadata for a single uploaded file, derived from the multipart part. */
export const uploadedFileMetaSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
})

export type UploadedFileMeta = z.infer<typeof uploadedFileMetaSchema>
