/*
 * -------------------------------------------------------------------------------------------------
 * authentication
 * -------------------------------------------------------------------------------------------------
 */

export const REALM = 'realm'
export type REALM = typeof REALM

// authentication schemes https://www.iana.org/assignments/http-authschemes

export const AuthenticationSchemes = {
  BASIC: 'basic',
  BEARER: 'bearer',
  DIGEST: 'digest',
  HOBA: 'hoba',
  MUTUAL: 'mutual',
  NEGOTIATE: 'negotiate',
  OAUTH: 'oauth',
  SCRAM_SHA_1: 'scram-sha-1',
  SCRAM_SHA_256: 'scram-sha-256',
  VAPID: 'vapid'
} as const

export type AuthenticationScheme = typeof AuthenticationSchemes[keyof typeof AuthenticationSchemes]

/*
 * -------------------------------------------------------------------------------------------------
 * cache
 * -------------------------------------------------------------------------------------------------
 */

export const CacheControlDirectives = {
  IMMUTABLE: 'immutable',
  MAX_AGE: 'max-age',
  MAX_STALE: 'max-stale',
  MIN_FRESH: 'min-fresh',
  MUST_REVALIDATE: 'must-revalidate',
  NO_CACHE: 'no-cache',
  NO_STORE: 'no-store',
  NO_TRANSFORM: 'no-transform',
  ONLY_IF_CACHED: 'only-if-cached',
  PRIVATE: 'private',
  PROXY_REVALIDATE: 'proxy-revalidate',
  PUBLIC: 'public',
  STALE_IF_ERROR: 'stale-if-error',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
} as const

export type CacheControlDirective = typeof CacheControlDirectives[keyof typeof CacheControlDirectives]

/*
 * -------------------------------------------------------------------------------------------------
 * connection
 * -------------------------------------------------------------------------------------------------
 */

export const CLOSE      = 'close'
export const KEEP_ALIVE = 'keep-alive'

/*
 * -------------------------------------------------------------------------------------------------
 * content-disposition
 * -------------------------------------------------------------------------------------------------
 */

export const ATTACHMENT = 'attachment'
export const FILE       = 'file'
export const FILENAME   = 'filename'
export const FORM_DATA  = 'form-data'
export const NAME       = 'name'

/*
 * -------------------------------------------------------------------------------------------------
 * content-type
 * -------------------------------------------------------------------------------------------------
 */
export const ContentType = {
  ALL: '*/*',
  APPLICATION: 'application/*',
  APPLICATION_ECMASCRIPT: 'application/ecmascript',
  APPLICATION_GRAPHQL: 'application/graphql',
  APPLICATION_JAVASCRIPT: 'application/javascript',
  APPLICATION_JSON: 'application/json',
  APPLICATION_OCTET_STREAM: 'application/octet-stream',
  APPLICATION_PDF: 'application/pdf',
  APPLICATION_RTF: 'application/rtf',
  APPLICATION_XHTML: 'application/xhtml+xml',
  APPLICATION_XML: 'application/xml',
  APPLICATION_X_RAR: 'application/x-rar-compressed',
  APPLICATION_X_TAR: 'application/x-tar',
  APPLICATION_X_TZ_COMPRESSED: 'application/x-7z-compressed',
  APPLICATION_X_WWW_FORM_URLENCODED: 'application/x-www-form-urlencoded',
  APPLICATION_VND_API_JSON: 'application/vnd.api+json',
  APPLICATION_ZIP: 'application/zip',
  APPLICATION_ZSTD: 'application/zstd',
  AUDIO: 'audio/*',
  AUDIO_MPEG: 'audio/mpeg',
  AUDIO_OGG: 'audio/ogg',
  FONT_TTF: 'font/ttf',
  FONT_WOFF: 'font/woff',
  FONT_WOFF2: 'font/woff2',
  IMAGE: 'image/*',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_TIFF: 'image/tiff',
  IMAGE_SVG_XML: 'image/svg+xml',
  IMAGE_WEBP: 'image/webp',
  MULTIPART_FORM_DATA: 'multipart/form-data',
  MULTIPART_MIXED: 'multipart/mixed',
  TEXT_CSS: 'text/css',
  TEXT_CSV: 'text/csv',
  TEXT_EVENT_STREAM: 'text/event-stream',
  TEXT_HTML: 'text/html',
  TEXT_PLAIN: 'text/plain',
  VIDEO_MP4: 'video/mp4',
  VIDEO_WEBM: 'video/webm'
} as const

export type ContentType = typeof ContentType[keyof typeof ContentType]

/*
 * -------------------------------------------------------------------------------------------------
 * encoding
 * -------------------------------------------------------------------------------------------------
 */
export const Encodings = {
  BASE64: 'base64',
  BINARY: 'binary',
  BR: 'br',
  CHUNKED: 'chunked',
  COMPRESS: 'compress',
  DEFLATE: 'deflate',
  GZIP: 'gzip',
  GZIP_DEFLATE: 'gzip,deflate',
  IDENTITY: 'identity'
} as const

export type Encoding = typeof Encodings[keyof typeof Encodings]

/*
 * -------------------------------------------------------------------------------------------------
 * misc
 * -------------------------------------------------------------------------------------------------
 */

export const BOUNDARY = 'boundary'
export type BOUNDARY = typeof BOUNDARY

export const BYTES = 'bytes'
export type BYTES = typeof BYTES

export const CHARSET = 'charset'
export type CHARSET = typeof CHARSET

export const CONTINUE = '100-continue'
export type CONTINUE = typeof CONTINUE

export const NONE = 'none'
export type NONE = typeof NONE

export const QUOTED_PRINTABLE = 'quoted-printable'
export type QUOTED_PRINTABLE = typeof QUOTED_PRINTABLE

export const S_MAXAGE = 's-maxage'
export type S_MAXAGE = typeof S_MAXAGE

export const TRAILERS = 'trailers'
export type TRAILERS = typeof TRAILERS

export const UPGRADE = 'upgrade'
export type UPGRADE = typeof UPGRADE

export const WEBSOCKET = 'websocket'
export type WEBSOCKET = typeof WEBSOCKET

export const XML_HTTP_REQUEST = 'XmlHttpRequest'
export type XML_HTTP_REQUEST = typeof XML_HTTP_REQUEST

export const ZERO = '0'
export type ZERO = typeof ZERO

export const ZSTD = 'zstd'
export type ZSTD = typeof ZSTD

export const ClearSiteDataDirectives = {
  ALL: 'all',
  CACHE: 'cache',
  COOKIES: 'cookies',
  STORAGE: 'storage',
  EXECUTION_CONTEXTS: 'executionContexts'
} as const

export type ClearSiteDataDirective = typeof ClearSiteDataDirectives[keyof typeof ClearSiteDataDirectives]
