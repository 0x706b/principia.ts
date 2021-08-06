import type {
  AuthenticationScheme,
  CacheControlDirective,
  ClearSiteDataDirective,
  ContentType,
  Encoding
} from './HeaderValues'
import type { WarningCode } from './WarningCodes'
import type { HashMap } from '@principia/base/HashMap'
import type { URL } from 'url'

import * as HM from '@principia/base/HashMap'
import { isArray, isBoolean, isDate, isNumber, isString } from '@principia/base/prelude'
import * as R from '@principia/base/Record'
import * as Str from '@principia/base/string'

import {
  ACCEPT,
  ACCEPT_ENCODING,
  ACCEPT_LANGUAGE,
  ACCEPT_RANGES,
  ACCESS_CONTROL_ALLOW_CREDENTIALS,
  ACCESS_CONTROL_ALLOW_HEADERS,
  ACCESS_CONTROL_ALLOW_METHODS,
  ACCESS_CONTROL_ALLOW_ORIGIN,
  ACCESS_CONTROL_EXPOSE_HEADERS,
  ACCESS_CONTROL_MAX_AGE,
  ACCESS_CONTROL_REQUEST_HEADERS,
  ACCESS_CONTROL_REQUEST_METHOD,
  AGE,
  ALLOW,
  ALT_SVC,
  AUTHORIZATION,
  CACHE_CONTROL,
  CLEAR_SITE_DATA,
  CONTENT_DISPOSITION,
  CONTENT_ENCODING,
  CONTENT_LANGUAGE,
  CONTENT_LENGTH,
  CONTENT_LOCATION,
  CONTENT_RANGE,
  CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  CONTENT_TYPE,
  COOKIE,
  CROSS_ORIGIN_EMBEDDER_POLICY,
  CROSS_ORIGIN_OPENER_POLICY,
  CROSS_ORIGIN_RESOURCE_POLICY,
  DATE,
  DOMAIN,
  ETAG,
  EXPECT_CT,
  EXPIRES,
  FROM,
  HOST,
  HTTP_ONLY,
  IF_MATCH,
  IF_MODIFIED_SINCE,
  IF_NONE_MATCH,
  IF_RANGE,
  IF_UNMODIFIED_SINCE,
  LARGE_ALLOCATION,
  LAST_MODIFIED,
  LOCATION,
  MAX_AGE,
  ORIGIN,
  PROXY_AUTHENTICATE,
  PROXY_AUTHORIZATION,
  RANGE,
  RETRY_AFTER,
  SAME_SITE,
  SEC_FETCH_DEST,
  SEC_FETCH_MODE,
  SEC_FETCH_SITE,
  SEC_FETCH_USER,
  SECURE,
  SET_COOKIE,
  SOURCE_MAP,
  STRICT_TRANSPORT_SECURITY,
  TE,
  TIMING_ALLOW_ORIGIN,
  TRAILER,
  TRANSFER_ENCODING,
  UPGRADE,
  VARY,
  WARNING,
  WWW_AUTHENTICATE,
  X_CONTENT_TYPE_OPTIONS,
  X_DNS_PREFETCH_CONTROL,
  X_FRAME_OPTIONS
} from './HeaderNames'

export class Headers {
  constructor(readonly map: HashMap<string, ReadonlyArray<string>> = HM.makeDefault()) {}
}

export function add_(headers: Headers, name: string, value: string | ReadonlyArray<string>): Headers {
  return new Headers(headers.map.set(name, isString(value) ? [value] : value))
}

export function add(name: string, value: string | ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => add_(headers, name, value)
}

export function accept_(headers: Headers, ...values: ReadonlyArray<ContentType | [ContentType, number]>): Headers
export function accept_(headers: Headers, ...values: ReadonlyArray<string | [ContentType, number]>): Headers
export function accept_(headers: Headers, ...values: ReadonlyArray<ContentType | [string, number]>): Headers
export function accept_(headers: Headers, ...values: ReadonlyArray<string | [string, number]>): Headers
export function accept_(headers: Headers, ...values: ReadonlyArray<string | [string, number]>): Headers {
  return add_(
    headers,
    ACCEPT,
    values.map((ct) => (isArray(ct) ? `${ct[0]};q=${ct[1]}` : ct))
  )
}

export function accept(...values: ReadonlyArray<ContentType | [ContentType, number]>): (headers: Headers) => Headers
export function accept(...values: ReadonlyArray<string | [ContentType, number]>): (headers: Headers) => Headers
export function accept(...values: ReadonlyArray<ContentType | [string, number]>): (headers: Headers) => Headers
export function accept(...values: ReadonlyArray<string | [string, number]>): (headers: Headers) => Headers
export function accept(...values: ReadonlyArray<string | [string, number]>): (headers: Headers) => Headers {
  return (headers) => accept_(headers, ...values)
}

export function acceptEncoding_(headers: Headers, ...values: ReadonlyArray<Encoding | [Encoding, number]>): Headers
export function acceptEncoding_(headers: Headers, ...values: ReadonlyArray<string | [Encoding, number]>): Headers
export function acceptEncoding_(headers: Headers, ...values: ReadonlyArray<Encoding | [string, number]>): Headers
export function acceptEncoding_(headers: Headers, ...values: ReadonlyArray<string | [string, number]>): Headers
export function acceptEncoding_(headers: Headers, ...values: ReadonlyArray<string | [string, number]>): Headers {
  return add_(
    headers,
    ACCEPT_ENCODING,
    values.map((enc) => (isArray(enc) ? `${enc[0]};q=${enc[1]}` : enc))
  )
}

export function acceptEncoding(...values: ReadonlyArray<Encoding | [Encoding, number]>): (headers: Headers) => Headers
export function acceptEncoding(...values: ReadonlyArray<string | [Encoding, number]>): (headers: Headers) => Headers
export function acceptEncoding(...values: ReadonlyArray<Encoding | [string, number]>): (headers: Headers) => Headers
export function acceptEncoding(...values: ReadonlyArray<string | [string, number]>): (headers: Headers) => Headers
export function acceptEncoding(...values: ReadonlyArray<string | [string, number]>): (headers: Headers) => Headers {
  return (headers) => acceptEncoding_(headers, ...values)
}

export function acceptLanguage_(headers: Headers, ...langs: ReadonlyArray<string | [string, number]>): Headers {
  return add_(
    headers,
    ACCEPT_LANGUAGE,
    langs.map((l) => (isArray(l) ? `${l[0]};q=${l[1]}` : l))
  )
}

export function acceptLanguage(...langs: ReadonlyArray<string | [string, number]>): (headers: Headers) => Headers {
  return (headers) => acceptLanguage_(headers, ...langs)
}

export function accessControlAllowOrigin_(headers: Headers, origin: string): Headers {
  return add_(headers, ACCESS_CONTROL_ALLOW_ORIGIN, origin)
}

export function accessControlAllowOrigin(origin: string): (headers: Headers) => Headers {
  return (headers) => accessControlAllowOrigin_(headers, origin)
}

export function accessControlAllowCredentials(headers: Headers): Headers {
  return add_(headers, ACCESS_CONTROL_ALLOW_CREDENTIALS, 'true')
}

export function accessControlAllowHeaders_(headers: Headers, ...values: ReadonlyArray<string>): Headers {
  return add_(headers, ACCESS_CONTROL_ALLOW_HEADERS, values)
}

export function accessControlAllowHeaders(...values: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => accessControlAllowHeaders_(headers, ...values)
}

export function accessControlAllowMethods_(headers: Headers, ...values: ReadonlyArray<string>): Headers {
  return add_(headers, ACCESS_CONTROL_ALLOW_METHODS, values)
}

export function accessControlAllowMethods(...values: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => accessControlAllowMethods_(headers, ...values)
}

export function accessControlExposeHeaders_(headers: Headers, ...values: ReadonlyArray<string>): Headers {
  return add_(headers, ACCESS_CONTROL_EXPOSE_HEADERS, values)
}

export function accessControlExposeHeaders(...values: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => accessControlExposeHeaders_(headers, ...values)
}

export function accessControlMaxAge_(headers: Headers, deltaSeconds: number): Headers {
  return add_(headers, ACCESS_CONTROL_MAX_AGE, deltaSeconds.toString(10))
}

export function accessControlMaxAge(deltaSeconds: number): (headers: Headers) => Headers {
  return (headers) => accessControlMaxAge_(headers, deltaSeconds)
}

export function accessControlRequestHeaders_(headers: Headers, ...values: ReadonlyArray<string>): Headers {
  return add_(headers, ACCESS_CONTROL_REQUEST_HEADERS, values)
}

export function accessControlRequestHeaders(...values: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => accessControlRequestHeaders_(headers, ...values)
}

export function accessControlRequestMethod_(headers: Headers, value: string): Headers {
  return add_(headers, ACCESS_CONTROL_REQUEST_METHOD, value)
}

export function accessControlRequestMethod(value: string): (headers: Headers) => Headers {
  return (headers) => accessControlRequestMethod_(headers, value)
}

export function acceptRanges_(headers: Headers, value: 'bytes' | 'none'): Headers {
  return add_(headers, ACCEPT_RANGES, value)
}

export function acceptRanges(value: 'bytes' | 'none'): (headers: Headers) => Headers {
  return (headers) => acceptRanges_(headers, value)
}

export function age_(headers: Headers, deltaSeconds: number): Headers {
  return add_(headers, AGE, deltaSeconds.toString(10))
}

export function age(deltaSeconds: number): (headers: Headers) => Headers {
  return (headers) => age_(headers, deltaSeconds)
}

export function allow_(headers: Headers, value: string): Headers {
  return add_(headers, ALLOW, value)
}

export function allow(value: string): (headers: Headers) => Headers {
  return (headers) => allow_(headers, value)
}

export interface AltSvcOptions {
  readonly protocolId: string
  readonly host?: string
  readonly port: number
  readonly maxAge?: number
  readonly persist?: boolean
}

export function altSvc_(headers: Headers, options: { readonly clear: true }): Headers
export function altSvc_(headers: Headers, ...options: ReadonlyArray<AltSvcOptions>): Headers
export function altSvc_(
  headers: Headers,
  ...clearOrOptions: [{ readonly clear: true }] | ReadonlyArray<AltSvcOptions>
): Headers {
  let header: string
  if (clearOrOptions[0] && 'clear' in clearOrOptions[0]) {
    header = 'clear'
  } else {
    header = (clearOrOptions as ReadonlyArray<AltSvcOptions>).foldl('', (b, a) => {
      let part = `${a.protocolId}=`
      if (a.host) {
        part += doubleQuote(`${a.host}:${a.port}`)
      } else {
        part += doubleQuote(`:${a.port}`)
      }
      if (a.maxAge) {
        part += `; ma=${a.maxAge}`
      }
      if (a.persist) {
        part += '; persist=1'
      }
      return `${b}, ${part}`
    })
  }
  return add_(headers, ALT_SVC, header)
}

export function altSvc(options: { readonly clear: true }): (headers: Headers) => Headers
export function altSvc(...options: ReadonlyArray<AltSvcOptions>): (headers: Headers) => Headers
export function altSvc(
  ...options: [{ readonly clear: true }] | ReadonlyArray<AltSvcOptions>
): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => altSvc_(headers, ...options)
}

export function authorization_(
  headers: Headers,
  type: 'www' | 'proxy',
  scheme: AuthenticationScheme,
  credentials: string
): Headers {
  return add_(headers, type === 'www' ? AUTHORIZATION : PROXY_AUTHORIZATION, `${scheme} ${credentials}`)
}

export function authorization(
  type: 'www' | 'proxy',
  scheme: AuthenticationScheme,
  credentials: string
): (headers: Headers) => Headers {
  return (headers) => authorization_(headers, type, scheme, credentials)
}

export function authenticate_(
  headers: Headers,
  type: 'www' | 'proxy',
  scheme: AuthenticationScheme,
  realm: string,
  charset?: string
): Headers {
  const value = `${scheme} realm="${realm}"`
  return add_(
    headers,
    type === 'www' ? WWW_AUTHENTICATE : PROXY_AUTHENTICATE,
    charset ? [value, `charset=${doubleQuote(charset)}`] : value
  )
}

export function authenticate(
  type: 'www' | 'proxy',
  scheme: AuthenticationScheme,
  realm: string,
  charset?: string
): (headers: Headers) => Headers {
  return (headers) => authenticate_(headers, type, scheme, realm, charset)
}

export function cacheControl_(headers: Headers, directive: 'max-age', seconds: number): Headers
export function cacheControl_(headers: Headers, directive: 'min-fresh', seconds: number): Headers
export function cacheControl_(headers: Headers, directive: 'max-stale', seconds?: number): Headers
export function cacheControl_(
  headers: Headers,
  directive: Exclude<CacheControlDirective, 'max-age' | 'max-stale' | 'min-fresh'>
): Headers
export function cacheControl_(headers: Headers, directive: string, seconds?: number): Headers {
  return add_(headers, CACHE_CONTROL, seconds ? `${directive}=${seconds}` : directive)
}

export function cacheControl(directive: 'max-age', seconds: number): (headers: Headers) => Headers
export function cacheControl(directive: 'min-fresh', seconds: number): (headers: Headers) => Headers
export function cacheControl(directive: 'max-stale', seconds?: number): (headers: Headers) => Headers
export function cacheControl(
  directive: Exclude<CacheControlDirective, 'max-age' | 'max-stale' | 'min-fresh'>
): (headers: Headers) => Headers
export function cacheControl(directive: string, seconds?: number): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => cacheControl_(headers, directive, seconds)
}

export function clearSiteData_(headers: Headers, ...directives: ReadonlyArray<ClearSiteDataDirective>): Headers {
  return add_(headers, CLEAR_SITE_DATA, directives.map(doubleQuote))
}

export function clearSiteData(...directives: ReadonlyArray<ClearSiteDataDirective>): (headers: Headers) => Headers {
  return (headers) => clearSiteData_(headers, ...directives)
}

export function contentType_(
  headers: Headers,
  value: 'multipart/form-data',
  boundary: string,
  charset?: string
): Headers
export function contentType_(
  headers: Headers,
  value: Exclude<ContentType, 'multipart/form-data'>,
  charset?: string
): Headers
export function contentType_(headers: Headers, value: string, charset?: string): Headers
export function contentType_(headers: Headers, value: string, boundaryOrCharset?: string, charset?: string): Headers {
  return add_(
    headers,
    CONTENT_TYPE,
    value === 'multipart/form-data'
      ? charset
        ? `${value}; charset=${charset}; boundary=${boundaryOrCharset!}`
        : `${value}; boundary=${boundaryOrCharset!}`
      : boundaryOrCharset
      ? `${value}; charset=${boundaryOrCharset}`
      : value
  )
}

export function contentType(
  value: 'multipart/form-data',
  boundary: string,
  charset?: string
): (headers: Headers) => Headers
export function contentType(value: ContentType, charset?: string): (headers: Headers) => Headers
export function contentType(value: string, charset?: string): (headers: Headers) => Headers
export function contentType(
  value: string,
  boundaryOrCharset?: string,
  charset?: string
): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => contentType_(headers, value, boundaryOrCharset, charset)
}

export function contentDisposition_(headers: Headers, value: 'form-data', name: string, filename?: string): Headers
export function contentDisposition_(headers: Headers, value: 'inline' | 'attachment', filename?: string): Headers
export function contentDisposition_(
  headers: Headers,
  value: string,
  filenameOrFieldName?: string,
  filename?: string
): Headers {
  return add_(
    headers,
    CONTENT_DISPOSITION,
    value === 'form-data'
      ? `${value}; ${doubleQuote(filenameOrFieldName!)}${filename ? `; ${doubleQuote(filename)}` : ''}`
      : `${value}${filenameOrFieldName ? `; ${filenameOrFieldName}` : ''}`
  )
}

export function contentDisposition(value: 'form-data', name: string, filename?: string): (headers: Headers) => Headers
export function contentDisposition(value: 'inline' | 'attachment', filename?: string): (headers: Headers) => Headers
export function contentDisposition(
  value: string,
  filenameOrFieldName?: string,
  filename?: string
): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => contentDisposition_(headers, value, filenameOrFieldName, filename)
}

export function contentLanguage_(headers: Headers, ...values: ReadonlyArray<string>): Headers {
  return add_(headers, CONTENT_LANGUAGE, values)
}

export function contentLanguage(...values: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => contentLanguage_(headers, ...values)
}

export function contentLength_(headers: Headers, value: number): Headers {
  return add_(headers, CONTENT_LENGTH, value.toString())
}

export function contentLength(value: number): (headers: Headers) => Headers {
  return (headers) => contentLength_(headers, value)
}

export function contentLocation_(headers: Headers, value: URL): Headers {
  return add_(headers, CONTENT_LOCATION, value.toString())
}

export function contentLocation(value: URL): (headers: Headers) => Headers {
  return (headers) => contentLocation_(headers, value)
}

export function contentRange_(headers: Headers, unit: string, range: readonly [number, number], size?: number): Headers
export function contentRange_(headers: Headers, unit: string, size: number): Headers
export function contentRange_(
  headers: Headers,
  unit: string,
  sizeOrRange: readonly [number, number] | number,
  size?: number
): Headers {
  let value = unit
  if (isNumber(sizeOrRange)) {
    value += ` */${sizeOrRange}`
  } else {
    value += ` ${sizeOrRange[0]}-${sizeOrRange[1]}`
    if (size) {
      value += `/${size}`
    } else {
      value += '/*'
    }
  }
  return add_(headers, CONTENT_RANGE, value)
}

export function contentRange(
  unit: string,
  range: readonly [number, number],
  size?: number
): (headers: Headers) => Headers
export function contentRange(unit: string, size: number): (headers: Headers) => Headers
export function contentRange(
  unit: string,
  sizeOrRange: readonly [number, number] | number,
  size?: number
): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => contentRange_(headers, unit, sizeOrRange, size)
}

export type ContentSecurityPolicySource = URL | string

export type ContentSecurityPolicySandbox =
  | 'allow-downloads'
  | 'allow-forms'
  | 'allow-modals'
  | 'allow-orientation-lock'
  | 'allow-pointer-lock'
  | 'allow-popups'
  | 'allow-popups-to-escape-sandbox'
  | 'allow-presentation'
  | 'allow-same-origin'
  | 'allow-scripts'
  | 'allow-top-navigation'
  | 'allow-top-navigation-by-user-activation'
  | 'allow-storage-access-by-user-activation'
  | 'allow-downloads-without-user-activation'

export interface ContentSecurityPolicy {
  readonly childSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly connectSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly defaultSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly frameSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly imgSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly manifestSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly mediaSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly prefetchSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly scriptSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly scriptSrcElem?: ReadonlyArray<ContentSecurityPolicySource>
  readonly scriptSrcAttr?: ReadonlyArray<ContentSecurityPolicySource>
  readonly styleSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly styleSrcElem?: ReadonlyArray<ContentSecurityPolicySource>
  readonly styleSrcAttr?: ReadonlyArray<ContentSecurityPolicySource>
  readonly workerSrc?: ReadonlyArray<ContentSecurityPolicySource>
  readonly baseUri?: ReadonlyArray<ContentSecurityPolicySource>
  readonly sandbox?: ContentSecurityPolicySandbox
  readonly formAction?: ReadonlyArray<ContentSecurityPolicySource>
  readonly frameAncestors?: ReadonlyArray<ContentSecurityPolicySource>
  readonly navigateTo?: ReadonlyArray<ContentSecurityPolicySource>
  readonly reportUri?: ReadonlyArray<ContentSecurityPolicySource>
  readonly reportTo?: object
  readonly upgradeInsecureRequests?: boolean
}

export const ContentSecurityPolicyDirectives: Record<keyof ContentSecurityPolicy, string> = {
  childSrc: 'child-src',
  connectSrc: 'connect-src',
  defaultSrc: 'default-src',
  frameSrc: 'frame-src',
  imgSrc: 'img-src',
  manifestSrc: 'manifest-src',
  mediaSrc: 'media-src',
  prefetchSrc: 'prefetch-src',
  scriptSrc: 'script-src',
  scriptSrcElem: 'script-src-elem',
  scriptSrcAttr: 'script-src-attr',
  styleSrc: 'style-src',
  styleSrcElem: 'style-src-elem',
  styleSrcAttr: 'style-src-attr',
  workerSrc: 'worker-src',
  baseUri: 'base-uri',
  sandbox: 'sandbox',
  formAction: 'form-action',
  frameAncestors: 'frame-ancestors',
  navigateTo: 'navigate-to',
  reportUri: 'report-uri',
  reportTo: 'report-to',
  upgradeInsecureRequests: 'upgrade-insecure-requests'
}

const contentSecurityPolicySources = ['self', 'unsafe-eval', 'unsafe-hashes', 'unsafe-inline', 'none']

function normalizeContentSecurityPolicySource(source: ContentSecurityPolicySource): string {
  if (isString(source)) {
    if (contentSecurityPolicySources.elem(Str.Eq)(source)) {
      return singleQuote(source)
    }
    return source
  }
  return source.toString()
}

function processContentSecurityPolicy(policy: ContentSecurityPolicy): string {
  return R.foldl_(
    policy as Record<string, any>,
    [] as unknown as [string, ReadonlyArray<string>][],
    (b, a, k): [string, ReadonlyArray<string>][] => {
      const name = ContentSecurityPolicyDirectives[k]
      if (isArray(a)) {
        return [...b, [name, a.map(normalizeContentSecurityPolicySource)]]
      } else if (isString(a)) {
        return [...b, [name, [a]]]
      } else if (isBoolean(a)) {
        return [...b, [name, [String(a)]]]
      } else {
        return [...b, [name, [JSON.stringify(a)]]]
      }
    }
  ).foldl('', (b, [name, values]) => b.concat(`; ${name} ${values.join(' ')}`))
}

export function contentSecurityPolicy_(headers: Headers, policy: ContentSecurityPolicy): Headers {
  return add_(headers, CONTENT_SECURITY_POLICY, processContentSecurityPolicy(policy))
}

export function contentSecurityPolicy(policy: ContentSecurityPolicy): (headers: Headers) => Headers {
  return (headers) => contentSecurityPolicy_(headers, policy)
}

export function contentSecurityPolicyReportOnly_(headers: Headers, policy: ContentSecurityPolicy) {
  return add_(headers, CONTENT_SECURITY_POLICY_REPORT_ONLY, processContentSecurityPolicy(policy))
}

export function contentSecurityPolicyReportOnly(policy: ContentSecurityPolicy): (headers: Headers) => Headers {
  return (headers) => contentSecurityPolicyReportOnly_(headers, policy)
}

export function cookie_(headers: Headers, cookies: Record<string, string>): Headers {
  return add_(
    headers,
    COOKIE,
    R.toArray(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  )
}

export function cookie(cookies: Record<string, string>): (headers: Headers) => Headers {
  return (headers) => cookie_(headers, cookies)
}

export function crossOriginEmbedderPolicy_(headers: Headers, value: 'unsafe-none' | 'require-corp'): Headers {
  return add_(headers, CROSS_ORIGIN_EMBEDDER_POLICY, value)
}

export function crossOriginEmbedderPolicy(value: 'unsafe-none' | 'require-corp'): (headers: Headers) => Headers {
  return (headers) => crossOriginEmbedderPolicy_(headers, value)
}

export function crossOriginOpenerPolicy_(
  headers: Headers,
  value: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
): Headers {
  return add_(headers, CROSS_ORIGIN_OPENER_POLICY, value)
}

export function crossOriginOpenerPolicy(
  value: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
): (headers: Headers) => Headers {
  return (headers) => crossOriginOpenerPolicy_(headers, value)
}

export function crossOriginResourcePolicy_(
  headers: Headers,
  value: 'same-site' | 'same-origin' | 'cross-origin'
): Headers {
  return add_(headers, CROSS_ORIGIN_RESOURCE_POLICY, value)
}

export function crossOriginResourcePolicy(
  value: 'same-site' | 'same-origin' | 'cross-origin'
): (headers: Headers) => Headers {
  return (headers) => crossOriginResourcePolicy_(headers, value)
}

export function date_(headers: Headers, date: Date): Headers {
  return add_(headers, DATE, date.toUTCString())
}

export function date(date: Date): (headers: Headers) => Headers {
  return (headers) => date_(headers, date)
}

export function eTag_(headers: Headers, value: string, weak?: boolean): Headers {
  return add_(headers, ETAG, `${weak ? 'W/' : ''}${doubleQuote(value)}`)
}

export function eTag(value: string, weak?: boolean): (headers: Headers) => Headers {
  return (headers) => eTag_(headers, value, weak)
}

export interface ExpectCTOptions {
  readonly uri: string | URL
  readonly enforce?: boolean
  readonly maxAge?: number
}

export function expectCT_(headers: Headers, options: ExpectCTOptions) {
  let header = `report-uri=${doubleQuote(options.uri.toString())}`
  options.enforce && (header += ', enforce')
  options.maxAge && (header += `, max-age=${options.maxAge}`)
  return add_(headers, EXPECT_CT, header)
}

export function exceptCT(options: ExpectCTOptions): (headers: Headers) => Headers {
  return (headers) => expectCT_(headers, options)
}

export function expired_(headers: Headers, date: Date): Headers {
  return add_(headers, EXPIRES, date.toUTCString())
}

export function expired(date: Date): (headers: Headers) => Headers {
  return (headers) => expired_(headers, date)
}

export function from_(headers: Headers, value: string): Headers {
  return add_(headers, FROM, value)
}

export function from(value: string): (headers: Headers) => Headers {
  return (headers) => from_(headers, value)
}

export function host_(headers: Headers, hostname: string, port?: number): Headers {
  return add_(headers, HOST, `${hostname}${port ? `:${port.toString(10)}` : ''}`)
}

export function host(hostname: string, port?: number): (headers: Headers) => Headers {
  return (headers) => host_(headers, hostname, port)
}

export function ifMatch_(headers: Headers, ...tags: ReadonlyArray<string>): Headers {
  return add_(headers, IF_MATCH, tags.map(doubleQuote))
}

export function ifMatch(...tags: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => ifMatch_(headers, ...tags)
}

export function ifModifiedSince_(headers: Headers, date: Date): Headers {
  return add_(headers, IF_MODIFIED_SINCE, date.toUTCString())
}

export function ifModifiedSince(date: Date): (headers: Headers) => Headers {
  return (headers) => ifModifiedSince_(headers, date)
}

export function ifUnmodifiedSince_(headers: Headers, date: Date): Headers {
  return add_(headers, IF_UNMODIFIED_SINCE, date.toUTCString())
}

export function ifNoneMatch_(headers: Headers, ...tags: ReadonlyArray<string>): Headers {
  return add_(headers, IF_NONE_MATCH, tags.map(doubleQuote))
}

export function ifNoneMatch(...tags: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => ifNoneMatch_(headers, ...tags)
}

export function ifUnmodifiedSince(date: Date): (headers: Headers) => Headers {
  return (headers) => ifUnmodifiedSince_(headers, date)
}

export function ifRange_(headers: Headers, value: string | Date): Headers {
  return add_(headers, IF_RANGE, isDate(value) ? value.toUTCString() : value)
}

export function ifRange(value: string | Date): (headers: Headers) => Headers {
  return (headers) => ifRange_(headers, value)
}

export function lastModified_(headers: Headers, date: Date): Headers {
  return add_(headers, LAST_MODIFIED, date.toUTCString())
}

export function lastModified(date: Date): (headers: Headers) => Headers {
  return (headers) => lastModified_(headers, date)
}

export function largeAllocation_(headers: Headers, mb: number): Headers {
  return add_(headers, LARGE_ALLOCATION, mb.toString(10))
}

export function largeAllocation(mb: number): (headers: Headers) => Headers {
  return (headers) => largeAllocation_(headers, mb)
}

export function location_(headers: Headers, value: URL): Headers {
  return add_(headers, LOCATION, value.toString())
}

export function location(value: URL): (headers: Headers) => Headers {
  return (headers) => location_(headers, value)
}

export function origin_(headers: Headers, value: URL): Headers {
  return add_(headers, ORIGIN, value.toString())
}

export function origin(value: URL): (headers: Headers) => Headers {
  return (headers) => origin_(headers, value)
}

export function range_(
  headers: Headers,
  unit: string,
  ...ranges: ReadonlyArray<readonly [start: number, end?: number]>
): Headers {
  return add_(
    headers,
    RANGE,
    `${unit}=${ranges
      .map(([start, end]) => (end ? `${start.toString(10)}-${end.toString(10)}` : `${start.toString(10)}-`))
      .join(', ')}`
  )
}

export function range(
  unit: string,
  ...ranges: ReadonlyArray<readonly [start: number, end?: number]>
): (headers: Headers) => Headers {
  return (headers) => range_(headers, unit, ...ranges)
}

export function retryAfter_(headers: Headers, date: Date): Headers
export function retryAfter_(headers: Headers, seconds: number): Headers
export function retryAfter_(headers: Headers, dateOrSeconds: Date | number): Headers {
  return add_(headers, RETRY_AFTER, isDate(dateOrSeconds) ? dateOrSeconds.toUTCString() : dateOrSeconds.toString(10))
}

export function retryAfter(date: Date): (headers: Headers) => Headers
export function retryAfter(seconds: number): (headers: Headers) => Headers
export function retryAfter(dateOrSeconds: Date | number): (headers: Headers) => Headers {
  // @ts-expect-error
  return (headers) => retryAfter_(headers, dateOrSeconds)
}

type SecFetchSiteDirective = 'cross-site' | 'same-origin' | 'same-site' | 'none'

export function secFetchSite_(headers: Headers, directive: SecFetchSiteDirective): Headers {
  return add_(headers, SEC_FETCH_SITE, directive)
}

export function secFetchSite(directive: SecFetchSiteDirective): (headers: Headers) => Headers {
  return (headers) => secFetchSite_(headers, directive)
}

type SecFetchModeDirective = 'cors' | 'navigate' | 'no-cors' | 'same-origin' | 'web-socket'

export function secFetchMode_(headers: Headers, directive: SecFetchModeDirective): Headers {
  return add_(headers, SEC_FETCH_MODE, directive)
}

export function secFetchMode(directive: SecFetchModeDirective): (headers: Headers) => Headers {
  return (headers) => secFetchMode_(headers, directive)
}

type SecFetchUserDirective = 'document' | 'navigate' | 'same-origin' | '?1'

export function secFetchUser_(headers: Headers, directive: SecFetchUserDirective): Headers {
  return add_(headers, SEC_FETCH_USER, directive)
}

export function secFetchUser(directive: SecFetchUserDirective): (headers: Headers) => Headers {
  return (headers) => secFetchUser_(headers, directive)
}

type SecFetchDestDirective =
  | 'audio'
  | 'audioworklet'
  | 'document'
  | 'embed'
  | 'empty'
  | 'font'
  | 'frame'
  | 'iframe'
  | 'image'
  | 'manifest'
  | 'object'
  | 'paintworklet'
  | 'report'
  | 'script'
  | 'serviceworker'
  | 'sharedworker'
  | 'style'
  | 'track'
  | 'video'
  | 'worker'
  | 'xslt'

export function secFetchDest_(headers: Headers, directive: SecFetchDestDirective): Headers {
  return add_(headers, SEC_FETCH_DEST, directive)
}

export function secFetchDest(directive: SecFetchDestDirective): (headers: Headers) => Headers {
  return (headers) => secFetchDest_(headers, directive)
}

export interface CookieAttributes {
  readonly expires?: Date
  readonly maxAge?: number
  readonly domain?: string
  readonly secure?: boolean
  readonly httpOnly?: boolean
  readonly sameSite?: 'strict' | 'lax' | 'none'
}

export function setCookie_(headers: Headers, name: string, value: string, attributes: CookieAttributes = {}): Headers {
  let header = `${name}=${value}`
  if (attributes.expires) {
    header += `; ${EXPIRES}=${attributes.expires.toUTCString()}`
  }
  if (attributes.maxAge) {
    header += `; ${MAX_AGE}=${attributes.maxAge.toString(10)}`
  }
  if (attributes.domain) {
    header += `; ${DOMAIN}=${attributes.domain}`
  }
  if (attributes.secure) {
    header += `; ${SECURE}`
  }
  if (attributes.httpOnly) {
    header += `; ${HTTP_ONLY}`
  }
  if (attributes.sameSite) {
    header += `; ${SAME_SITE}=${attributes.sameSite}`
  }
  return add_(headers, SET_COOKIE, header)
}

export function setCookie(
  name: string,
  value: string,
  attributes: CookieAttributes = {}
): (headers: Headers) => Headers {
  return (headers) => setCookie_(headers, name, value, attributes)
}

export function sourceMap_(headers: Headers, uri: URL | string): Headers {
  return add_(headers, SOURCE_MAP, uri.toString())
}

export function sourceMap(uri: URL | string): (headers: Headers) => Headers {
  return (headers) => sourceMap_(headers, uri)
}

export interface StrictTransportSecurityOptions {
  readonly maxAge: number
  readonly includeSubDomains?: boolean
  readonly preload?: boolean
}

export function strictTransportSecurity_(headers: Headers, options: StrictTransportSecurityOptions): Headers {
  let header = `max-age=${options.maxAge}`
  options.includeSubDomains && (header += '; includeSubDomains')
  options.preload && (header += '; preload')
  return add_(headers, STRICT_TRANSPORT_SECURITY, header)
}

export function strictTransportSecurity(options: StrictTransportSecurityOptions): (headers: Headers) => Headers {
  return (headers) => strictTransportSecurity_(headers, options)
}

export function te_(
  headers: Headers,
  ...directives: ReadonlyArray<Encoding | 'trailers' | [Encoding | 'trailers', number]>
): Headers {
  return add_(
    headers,
    TE,
    directives.map((directive) => (isArray(directive) ? `${directive[0]};q=${directive[1]}` : directive))
  )
}

export function te(
  ...directives: ReadonlyArray<Encoding | 'trailers' | [Encoding | 'trailers', number]>
): (headers: Headers) => Headers {
  return (headers) => te_(headers, ...directives)
}

export function timingAllowOrigin_(headers: Headers, value: '*'): Headers
export function timingAllowOrigin_(headers: Headers, ...values: ReadonlyArray<URL>): Headers
export function timingAllowOrigin_(headers: Headers, ...values: ReadonlyArray<'*' | URL>): Headers {
  return add_(
    headers,
    TIMING_ALLOW_ORIGIN,
    values[0] === '*' ? '*' : (values as ReadonlyArray<URL>).map((url) => url.toString())
  )
}

export function timingAllowOrigin(value: '*'): (headers: Headers) => Headers
export function timingAllowOrigin(...values: ReadonlyArray<URL>): (headers: Headers) => Headers
export function timingAllowOrigin(...values: ReadonlyArray<any>): (headers: Headers) => Headers {
  return (headers) => timingAllowOrigin_(headers, ...values)
}

export function transferEncoding_(headers: Headers, encoding: Encoding): Headers {
  return add_(headers, TRANSFER_ENCODING, encoding)
}

export function transferEncoding(encoding: Encoding): (headers: Headers) => Headers {
  return (headers) => transferEncoding_(headers, encoding)
}

export function trailer_(headers: Headers, ...headerNames: ReadonlyArray<string>): Headers {
  return add_(headers, TRAILER, headerNames)
}

export function trailer(...headerNames: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => trailer_(headers, ...headerNames)
}

export function upgrade_(
  headers: Headers,
  ...protocols: ReadonlyArray<[protocolName: string, protocolVersion?: number]>
): Headers {
  return add_(
    headers,
    UPGRADE,
    protocols.map(([name, version]) => (version ? `${name}/${version}` : name))
  )
}

export function upgrade(
  ...protocols: ReadonlyArray<[protocolName: string, protocolVersion?: number]>
): (headers: Headers) => Headers {
  return (headers) => upgrade_(headers, ...protocols)
}

export function vary_(headers: Headers, ...headerNames: ReadonlyArray<string>): Headers {
  return add_(headers, VARY, headerNames)
}

export function vary(...headerNames: ReadonlyArray<string>): (headers: Headers) => Headers {
  return (headers) => vary_(headers, ...headerNames)
}

export function warning_(headers: Headers, code: WarningCode, agent: string, text: string, date?: Date): Headers {
  const value = [code.toString(10), agent.isNonEmpty ? agent : '-', doubleQuote(text)]
  date && value.push(doubleQuote(date.toUTCString()))
  return add_(headers, WARNING, value)
}

export function warning(code: WarningCode, agent: string, text: string, date?: Date): (headers: Headers) => Headers {
  return (headers) => warning_(headers, code, agent, text, date)
}

export function xContentTypeOptions(headers: Headers): Headers {
  return add_(headers, X_CONTENT_TYPE_OPTIONS, 'nosniff')
}

export function xFrameOptions_(headers: Headers, directive: 'DENY' | 'SAMEORIGIN'): Headers {
  return add_(headers, X_FRAME_OPTIONS, directive)
}

export function xFrameOptions(directive: 'DENY' | 'SAMEORIGIN'): (headers: Headers) => Headers {
  return (headers) => xFrameOptions_(headers, directive)
}

export function xDnsPrefetchControl(headers: Headers): Headers {
  return add_(headers, X_DNS_PREFETCH_CONTROL, 'on')
}

function doubleQuote(s: string): string {
  if (s === '*') {
    return s
  }
  return s.startsWith('"') && s.endsWith('"') ? s : s.surround('"')
}

function singleQuote(s: string): string {
  return s.startsWith("'") && s.endsWith("'") ? s : s.surround("'")
}
