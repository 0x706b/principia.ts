import * as R from '../Record'
import * as Str from '../string'

const ANSI_BACKGROUND_OFFSET = 10
const ANSI_BRIGHT_OFFSET     = 60

export const {
  reset,
  bold,
  dim,
  italic,
  underline,
  blink,
  reversed,
  invisible,
  strikethrough,
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  brightBlack,
  brightRed,
  brightGreen,
  brightYellow,
  brightBlue,
  brightMagenta,
  brightCyan,
  brightWhite,
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  bgBrightBlack,
  bgBrightRed,
  bgBrightGreen,
  bgBrightYellow,
  bgBrightBlue,
  bgBrightMagenta,
  bgBrightCyan,
  bgBrightWhite
} = generateStyles()

function _rgb(offset = 0) {
  return (r: number, g: number, b: number) => (s: string) =>
    `\u001b[${38 + offset};2;${r};${g};${b}m${s}${offset === ANSI_BACKGROUND_OFFSET ? RESET_BG : RESET_FG}`
}

export function rgb(r: number, g: number, b: number): (s: string) => string {
  return _rgb(0)(r, g, b)
}

export function bg_rgb(r: number, g: number, b: number): (s: string) => string {
  return _rgb(ANSI_BACKGROUND_OFFSET)(r, g, b)
}

/**
 * Foreground color for ANSI black
 */
export const BLACK = escape(30)

/**
 * Foreground color for ANSI red
 */
export const RED = escape(31)

/**
 * Foreground color for ANSI green
 */
export const GREEN = escape(32)

/**
 * Foreground color for ANSI yellow
 */
export const YELLOW = escape(33)

/**
 * Foreground color for ANSI blue
 */
export const BLUE = escape(34)

/**
 * Foreground color for ANSI magenta
 */
export const MAGENTA = escape(35)

/**
 * Foreground color for ANSI cyan
 */
export const CYAN = escape(36)

/**
 * Foreground color for ANSI white
 */
export const WHITE = escape(37)

/**
 * Background color for ANSI black
 */
export const BLACK_B = escape(40)

/**
 * Background color for ANSI red
 */
export const RED_B = escape(41)

/**
 * Background color for ANSI green
 */
export const GREEN_B = escape(42)

/**
 * Background color for ANSI yellow
 */
export const YELLOW_B = escape(43)

/**
 * Background color for ANSI blue
 */
export const BLUE_B = escape(44)

/**
 * Background color for ANSI magenta
 */
export const MAGENTA_B = escape(45)

/**
 * Background color for ANSI cyan
 */
export const CYAN_B = escape(46)

/**
 * Background color for ANSI white
 */
export const WHITE_B = escape(47)

/**
 * Reset ANSI styles
 */
export const RESET = escape(0)

/**
 * ANSI bold
 */
export const BOLD = escape(1)

/**
 * ANSI underline
 */
export const UNDERLINE = escape(4)

/**
 * ANSI blink
 */
export const BLINK = escape(5)

/**
 * ANSI reversed
 */
export const REVERSED = escape(7)

/**
 * ANSI invisible
 */
export const INVISIBLE = escape(8)

/**
 * Reset ANSI foreground
 */
export const RESET_FG = escape(39)

/**
 * Reset ANSI background
 */
export const RESET_BG = escape(49)

/**
 * ANSI 24bit foreground
 */
export const RGB = <r extends number, g extends number, b extends number>(r: r, g: g, b: b) =>
  `\u001b[38;2;${r};${g};${b}m` as const

/**
 * ANSI 24bit background
 */
export const RGB_B = <r extends number, g extends number, b extends number>(r: r, g: g, b: b) =>
  `\u001b[48;2;${r};${g};${b}m` as const

/*
 * -------------------------------------------------------------------------------------------------
 * Internal
 * -------------------------------------------------------------------------------------------------
 */

function style(open: number, close: number) {
  return (s: string) => escape(open) + s + escape(close)
}

function generateStyles() {
  const modifiers = {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    blink: [5, 25],
    reversed: [7, 27],
    invisible: [8, 28],
    strikethrough: [9, 29]
  } as const

  const colors = {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39]
  } as const

  const colorsBright: {
    [K in keyof typeof colors as `bright${Capitalize<K>}`]: [number, number]
  } = R.ifoldl_(colors, {} as any, (b, k, [c, r]) => ({
    ...b,
    [`bright${Str.capitalize(k)}`]: [c + ANSI_BRIGHT_OFFSET, r]
  }))

  const colorsBg: {
    [K in keyof typeof colors as `bg${Capitalize<K>}`]: [number, number]
  } = R.ifoldl_(colors, {} as any, (b, k, [c, r]) => ({
    ...b,
    [`bg${Str.capitalize(k)}`]: [c + ANSI_BACKGROUND_OFFSET, r + ANSI_BACKGROUND_OFFSET]
  }))

  const colorsBrightBg: {
    [K in keyof typeof colors as `bgBright${Capitalize<K>}`]: [number, number]
  } = R.ifoldl_(colors, {} as any, (b, k, [c, r]) => ({
    ...b,
    [`bgBright${Str.capitalize(k)}`]: [c + ANSI_BRIGHT_OFFSET + ANSI_BACKGROUND_OFFSET, r + ANSI_BACKGROUND_OFFSET]
  }))

  return {
    ...R.map_(modifiers, ([open, close]) => style(open, close)),
    ...R.map_(colors, ([open, close]) => style(open, close)),
    ...R.map_(colorsBright, ([open, close]) => style(open, close)),
    ...R.map_(colorsBg, ([open, close]) => style(open, close)),
    ...R.map_(colorsBrightBg, ([open, close]) => style(open, close))
  }
}

function escape<style extends number>(style: style): `\u001b[${style}m` {
  return `\u001b[${style}m` as any
}
