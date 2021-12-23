import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as S from '@principia/schema'
import * as D from '@principia/schema/Decoder'

export interface ParsedContentType {
  readonly type: string
  readonly parameters: Record<string, string>
}

export const HttpContentType = {
  APPLICATION: 'application/*',
  APPLICATION_RTF: 'application/rtf',
  APPLICATION_ZIP: 'application/zip',
  APPLICATION_X_RAR: 'application/x-rar-compressed',
  APPLICATION_X_TAR: 'application/x-tar',
  APPLICATION_X_TZ_COMPRESSED: 'application/x-7z-compressed',
  APPLICATION_X_WWW_FORM_URLENCODED: 'application/x-www-form-urlencoded',
  APPLICATION_PDF: 'application/pdf',
  APPLICATION_JSON: 'application/json',
  APPLICATION_JAVASCRIPT: 'application/javascript',
  APPLICATION_ECMASCRIPT: 'application/ecmascript',
  APPLICATION_XML: 'application/xml',
  APPLICATION_OCTET_STREAM: 'application/octet-stream',
  APPLICATION_VND_API_JSON: 'application/vnd.api+json',
  APPLICATION_GRAPHQL: 'application/graphql',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  TEXT_CSS: 'text/css',
  TEXT_CSV: 'text/csv',
  IMAGE_WEBP: 'image/webp',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_TIFF: 'image/tiff',
  IMAGE_SVG_XML: 'image/svg+xml',
  AUDIO_MPEG: 'audio/mpeg',
  AUDIO_OGG: 'audio/ogg',
  AUDIO: 'audio/*',
  VIDEO_WEBM: 'video/webm',
  VIDEO_MP4: 'video/mp4',
  FONT_TTF: 'font/ttf',
  FONT_WOFF: 'font/woff',
  FONT_WOFF2: 'font/woff2',
  MULTIPART_FORM_DATA: 'multipart/form-data'
} as const

export type HttpContentType = typeof HttpContentType[keyof typeof HttpContentType]

export const ContentTypeModel = S.literal(
  'application/*',
  'application/rtf',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/x-7z-compressed',
  'application/x-www-form-urlencoded',
  'application/pdf',
  'application/json',
  'application/javascript',
  'application/ecmascript',
  'application/xml',
  'application/octet-stream',
  'application/vnd.api+json',
  'application/graphql',
  'text/plain',
  'text/html',
  'text/css',
  'text/csv',
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/svg+xml',
  'audio/mpeg',
  'audio/ogg',
  'audio/*',
  'video/webm',
  'video/mp4',
  'font/ttf',
  'font/woff',
  'font/woff2',
  'multipart/form-data'
)

export const CharsetModel = S.literal(
  'utf-8',
  'utf8',
  'ascii',
  'utf16le',
  'ucs2',
  'ucs-2',
  'binary',
  'hex',
  'base64',
  'latin1'
)

export const decodeCharset = S.to(D.Schemable)(CharsetModel)

export interface CookieOptions {
  readonly expires?: Date
  readonly domain?: string
  readonly httpOnly?: boolean
  readonly maxAge?: number
  readonly path?: string
  readonly sameSite?: boolean | 'strict' | 'lax'
  readonly secure?: boolean
  readonly signed?: boolean
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE'

export function parseContentType(s: string): ParsedContentType {
  return pipe(
    s.split(';'),
    A.ifoldl({ parameters: {} } as ParsedContentType, (i, b, a) => {
      if (i === 0) {
        return { type: a, parameters: {} }
      }
      const split = a.split('=')
      if (split[1][0] === '"') {
        split[1] = split[1].substr(1, split[1].length - 2)
      }
      return {
        ...b,
        parameters: {
          ...b.parameters,
          [split[0]]: split[1]
        }
      }
    })
  )
}
