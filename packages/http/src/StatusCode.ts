export interface StatusCode {
  readonly code: StatusCodes
  readonly message: string
}

function StatusCode(code: StatusCodes, message: string): StatusCode {
  return { code, message }
}

export const Continue                        = StatusCode(100, 'Continue')
export const SwitchingProtocols              = StatusCode(101, 'Switching Protocols')
export const Processing                      = StatusCode(102, 'Processing')
export const Ok                              = StatusCode(200, 'OK')
export const Created                         = StatusCode(201, 'Created')
export const Accepted                        = StatusCode(202, 'Accepted')
export const NonAuthoritativeInformation     = StatusCode(203, 'Non-authoritative Information')
export const NoContent                       = StatusCode(204, 'No Content')
export const ResetContent                    = StatusCode(205, 'Reset Content')
export const PartialContent                  = StatusCode(206, 'Partial Content')
export const MultiStatus                     = StatusCode(207, 'Multi-Status')
export const AlreadyReported                 = StatusCode(208, 'Already Reported')
export const ImUsed                          = StatusCode(226, 'IM Used')
export const MultipleChoices                 = StatusCode(300, 'Multiple Choices')
export const MovedPermanently                = StatusCode(301, 'Moved Permanently')
export const Found                           = StatusCode(302, 'Found')
export const SeeOther                        = StatusCode(303, 'See Other')
export const NotModified                     = StatusCode(304, 'Not Modified')
export const UseProxy                        = StatusCode(305, 'Use Proxy')
export const TemporaryRedirect               = StatusCode(307, 'Temporary Redirect')
export const PermanentRedirect               = StatusCode(308, 'Permanent Redirect')
export const BadRequest                      = StatusCode(400, 'Bad Request')
export const Unauthorized                    = StatusCode(401, 'Unauthorized')
export const PaymentRequired                 = StatusCode(402, 'Payment Required')
export const Forbidden                       = StatusCode(403, 'Forbidden')
export const NotFound                        = StatusCode(404, 'Not Found')
export const MethodNotAllowed                = StatusCode(405, 'Method Not Allowed')
export const NotAcceptable                   = StatusCode(406, 'Not Acceptable')
export const ProxyAuthenticationRequired     = StatusCode(407, 'Proxy Authentication Required')
export const RequestTimeout                  = StatusCode(408, 'Request Timeout')
export const Conflict                        = StatusCode(409, 'Conflict')
export const Gone                            = StatusCode(410, 'Gone')
export const LengthRequired                  = StatusCode(411, 'Length Required')
export const PreconditionFailed              = StatusCode(412, 'Precondition Failed')
export const PayloadTooLarge                 = StatusCode(413, 'Payload Too Large')
export const RequestUriTooLong               = StatusCode(414, 'Request-URI Too Long')
export const UnsupportedMediaType            = StatusCode(415, 'Unsupported Media Type')
export const RequestedRangeNotSatisfiable    = StatusCode(416, 'Requested Range Not Satisfiable')
export const ExpectationFailed               = StatusCode(417, 'Expectation Failed')
export const ImATeapot                       = StatusCode(418, "I'm a teapot")
export const MisdirectedRequest              = StatusCode(421, 'Misdirected Request')
export const UnprocessableEntity             = StatusCode(422, 'Unprocessable Entity')
export const Locked                          = StatusCode(423, 'Locked')
export const FailedDependency                = StatusCode(424, 'Failed Dependency')
export const UpgradeRequired                 = StatusCode(426, 'Upgrade Required')
export const PreconditionRequired            = StatusCode(428, 'Precondition Required')
export const TooManyRequests                 = StatusCode(429, 'Too Many Requests')
export const RequestHeaderFieldsTooLarge     = StatusCode(431, 'Request Header Fields Too Large')
export const ConnectionClosedWithoutResponse = StatusCode(444, 'Connection Closed Without Response')
export const UnavailableForLegalReasons      = StatusCode(451, 'Unavailable For Legal Reasons')
export const ClientClosedRequest             = StatusCode(499, 'Client Closed Request')
export const InternalServerError             = StatusCode(500, 'Internal Server Error')
export const NotImplemented                  = StatusCode(501, 'Not Implemented')
export const BadGateway                      = StatusCode(502, 'Bad Gateway')
export const ServiceUnavailable              = StatusCode(503, 'Service Unavailable')
export const GatewayTimeout                  = StatusCode(504, 'Gateway Timeout')
export const HttpVersionNotSupported         = StatusCode(505, 'HTTP Version Not Supported')
export const VariantAlsoNegotiates           = StatusCode(506, 'Variant Also Negotiates')
export const InsufficientStorage             = StatusCode(507, 'Insufficient Storage')
export const LoopDetected                    = StatusCode(508, 'Loop Detected')
export const NotExtended                     = StatusCode(510, 'Not Extended')
export const NetworkAuthenticationRequired   = StatusCode(511, 'Network Authentication Required')
export const NetworkConnectTimeoutError      = StatusCode(599, 'Network Connect Timeout Error')

export interface StatusCodesMap {
  Continue: 100
  SwitchingProtocols: 101
  Processing: 102
  EarlyHints: 103
  OK: 200
  Created: 201
  Accepted: 202
  NonAuthoritativeInformation: 203
  NoContent: 204
  ResetContent: 205
  PartialContent: 206
  MultiStatus: 207
  AlreadyReported: 208
  IMUsed: 226
  MultipleChoices: 300
  MovedPermanently: 301
  Found: 302
  SeeOther: 303
  NotModified: 304
  UseProxy: 305
  SwitchProxy: 306
  TemporaryRedirect: 307
  PermanentRedirect: 308
  BadRequest: 400
  Unauthorized: 401
  PaymentRequired: 402
  Forbidden: 403
  NotFound: 404
  MethodNotAllowed: 405
  NotAcceptable: 406
  ProxyAuthenticationRequired: 407
  RequestTimeout: 408
  Conflict: 409
  Gone: 410
  LengthRequired: 411
  PreconditionFailed: 412
  PayloadTooLarge: 413
  URITooLong: 414
  UnsupportedMediaType: 415
  RangeNotSatisfiable: 416
  ExpectationFailed: 417
  Teapot: 418
  MisdirectedRequest: 421
  UnprocessableEntity: 422
  Locked: 423
  FailedDependency: 424
  TooEarly: 425
  UpgradeRequired: 426
  PreconditionRequired: 428
  TooManyRequests: 429
  RequestHeaderFieldsTooLarge: 431
  ConnectionClosedWithoutResponse: 444
  UnavailableForLegalReasons: 451
  ClientClosedRequest: 499
  InternalServerError: 500
  NotImplemented: 501
  BadGateway: 502
  ServiceUnavailable: 503
  GatewayTimeout: 504
  HTTPVersionNotSupported: 505
  VariantAlsoNegotiates: 506
  InsufficientStorage: 507
  LoopDetected: 508
  NotExtended: 510
  NetworkAuthenticationRequired: 511
  NetworkConnectTimeoutError: 599
}

export type StatusCodes = StatusCodesMap[keyof StatusCodesMap]
