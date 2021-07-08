/* eslint-disable functional/immutable-data */
import type { Chunk } from '../../Chunk'
import type { TypedArray } from '../../prelude'
import type { StyleFunction } from './styles'

import * as A from '../../Array/core'
import { CaseClass } from '../../Case'
import * as C from '../../Chunk/core'
import { pipe } from '../../function'
import * as HM from '../../HashMap'
import * as It from '../../Iterable'
import * as O from '../../Option'
import {
  isAnyArrayBuffer,
  isArray,
  isArrayBuffer,
  isDataView,
  isDate,
  isDefined,
  isFunction,
  isMap,
  isObject,
  isPromise,
  isRegExp,
  isSet,
  isSymbol,
  isTypedArray,
  isWeakMap,
  isWeakSet,
  tuple
} from '../../prelude'
import * as str from '../../string'
import * as Z from '../../Z'
import { $show, isShowable } from './core'
import { stylizeNoColor, stylizeWithColor } from './styles'
import {
  ARRAY_EXTRAS_TYPE,
  ARRAY_TYPE,
  colorRegExp,
  escapeFn,
  getConstructorName,
  getFunctionBase,
  getKeys,
  getPrefix,
  getStringWidth,
  hex,
  keyStrRegExp,
  numberRegExp,
  OBJECT_TYPE,
  pluralize,
  PROTO_TYPE,
  strEscape,
  strEscapeSequencesReplacer
} from './util'

export interface ShowContextArgs {
  readonly stylize: StyleFunction
  readonly circular: HM.HashMap<unknown, number>
  readonly seen: Array<unknown>
  readonly indentationLevel: number
  readonly maxArrayLength: number
  readonly breakLength: number
  readonly compact: number | boolean
  readonly colors: boolean
  readonly depth: number
  readonly showHidden: boolean
  readonly maxStringLength: number
  readonly currentDepth: number
  readonly recurseTimes: number
  readonly budget: Record<number, number>
}

export interface ShowOptions {
  readonly maxArrayLength: number
  readonly maxStringLength: number
  readonly breakLength: number
  readonly compact: number | boolean
  readonly colors: boolean
  readonly depth: number
  readonly showHidden: boolean
}

export class ShowContext extends CaseClass<ShowContextArgs> {}

export type ShowComputationZ<A> = Z.Z<never, ShowContext, ShowContext, unknown, never, A>
export type ShowComputation = ShowComputationZ<string>
export type ShowComputationChunk = ShowComputationZ<Chunk<string>>

export interface ShowComputationPrimitive {
  readonly _tag: 'Primitive'
  readonly computation: ShowComputation
}
export function showComputationPrimitive(computation: ShowComputation): ShowComputationPrimitive {
  return {
    _tag: 'Primitive',
    computation
  }
}

export interface ShowComputationComplex {
  readonly _tag: 'Complex'
  extrasType?: number
  base?: ShowComputation
  indices?: ShowComputationChunk
  keys?: ShowComputationChunk
  braces?: [string, string]
}
export function showComputationComplex(args: Omit<ShowComputationComplex, '_tag'>): ShowComputationComplex {
  return {
    _tag: 'Complex',
    ...args
  }
}

export type ShowComputationExternal = ShowComputationPrimitive | ShowComputationComplex

function getShowContext(options?: Partial<ShowOptions>) {
  return new ShowContext({
    maxArrayLength: 100,
    maxStringLength: 100,
    breakLength: 100,
    compact: 3,
    colors: false,
    depth: 3,
    showHidden: true,
    circular: HM.makeDefault<unknown, number>(),
    seen: [],
    budget: {},
    indentationLevel: 0,
    stylize: options?.colors === true ? stylizeWithColor : stylizeNoColor,
    currentDepth: 0,
    recurseTimes: 0,
    ...(options || {})
  })
}

export function show(value: unknown): string {
  return Z.runStateResult_(_show(value), getShowContext())
}

export function showWithOptions(value: unknown, options: Partial<ShowOptions>): string {
  return Z.runStateResult_(_show(value), getShowContext(options))
}

export function _show(value: unknown): ShowComputation {
  return Z.getsZ((context) => {
    if (value === undefined) {
      return Z.pure(context.stylize('undefined', 'undefined'))
    }
    if (value === null) {
      return Z.pure(context.stylize('null', 'null'))
    }
    if (!isObject(value) && !isFunction(value)) {
      return Z.pure(_showPrimitive(context, value as Primitive))
    }

    return showValue(value)
  })
}

function showValue(value: object): ShowComputation {
  return Z.getsZ((context) => {
    if (A.exists_(context.seen, (v) => v === value)) {
      return pipe(
        Z.modify((context: ShowContext) =>
          pipe(
            HM.get_(context.circular, value),
            O.match(
              () => [
                context.circular.size + 1,
                context.copy({ circular: HM.set_(context.circular, value, context.circular.size + 1) })
              ],
              (n) => [n, context]
            )
          )
        ),
        Z.map((index) => context.stylize(`[Circular *${index}]`, 'special'))
      )
    }
    return showRaw(value)
  })
}

interface InspectionInfo {
  readonly _tag: 'InspectionInfo'
  readonly constructor: string | null
  readonly tag: string
  readonly base: string
  readonly formatter: (_: any) => ShowComputationChunk
  readonly braces: [string, string]
  readonly noIterator: boolean
  readonly extrasType: number
  readonly keys: ReadonlyArray<PropertyKey>
  readonly protoProps: Chunk<PropertyKey>
}
function inspectionInfo(args: Omit<InspectionInfo, '_tag'>): InspectionInfo {
  return {
    _tag: 'InspectionInfo',
    ...args
  }
}

interface InspectionEarlyReturn {
  readonly _tag: 'InspectionEarlyReturn'
  readonly shown: string
}
function inspectionEarlyReturn(shown: string): InspectionEarlyReturn {
  return {
    _tag: 'InspectionEarlyReturn',
    shown
  }
}

interface InspectionExternal {
  readonly _tag: 'InspectionExternal'
  readonly computation: ShowComputationExternal
}
function inspectionExternal(computation: ShowComputationExternal): InspectionExternal {
  return {
    _tag: 'InspectionExternal',
    computation
  }
}

type InspectionResult = InspectionInfo | InspectionEarlyReturn | InspectionExternal

/**
 * Determines the approximate type of the unknown value and collects information about
 * the structure of that value
 */
function getInspectionInfo(context: ShowContext, value: object, typedArray?: string): InspectionResult {
  if (isShowable(value)) {
    return inspectionExternal(value[$show])
  }

  let [constructor, protoProps] = getConstructorName(value)
  let keys                      = [] as Array<PropertyKey>
  let tag                       = value[Symbol.toStringTag]
  let base                      = ''
  let formatter                 = (_: any) => Z.pure(C.empty<string>()) as ShowComputationChunk
  let braces                    = ['', ''] as [string, string]
  let noIterator                = true
  let extrasType                = OBJECT_TYPE

  if (
    typeof tag !== 'string' ||
    (tag !== '' &&
      (context.showHidden ? Object.prototype.hasOwnProperty : Object.prototype.propertyIsEnumerable).call(
        value,
        Symbol.toStringTag
      ))
  ) {
    tag = ''
  }

  if (value[Symbol.iterator] || constructor === null) {
    noIterator = false
    if (C.isChunk(value)) {
      braces = [`Chunk (${value.length}) [`, ']']
      if (value.length == 0) {
        return inspectionEarlyReturn(`${braces[0]}]`)
      }
      protoProps = C.empty()
      extrasType = ARRAY_EXTRAS_TYPE
      formatter  = showChunk
    } else if (isArray(value)) {
      const prefix = getPrefix(constructor, tag, 'Array', `(${value.length})`)
      braces       = [`${prefix}[`, ']']
      if (value.length === 0) {
        return inspectionEarlyReturn(`${braces[0]}]`)
      }
      extrasType = ARRAY_EXTRAS_TYPE
      formatter  = showArray
    } else if (isSet(value)) {
      const size   = value.size
      const prefix = getPrefix(constructor, tag, 'Set', `(${size})`)
      keys         = getKeys(value, context.showHidden)
      formatter    = showSet
      if (size === 0 && keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(`${prefix}{}`)
      }
      braces = [`${prefix}{`, '}']
    } else if (isMap(value)) {
      const size   = value.size
      const prefix = getPrefix(constructor, tag, 'Map', `(${size})`)
      keys         = getKeys(value, context.showHidden)
      formatter    = showMap
      if (size === 0 && keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(`${prefix}{}`)
      }
      braces = [`${prefix}{`, '}']
    } else if (isTypedArray(value)) {
      const size     = value.length
      const fallback = value[Symbol.toStringTag]
      const prefix   = getPrefix(constructor, tag, fallback, `(${size})`)
      braces         = [`${prefix}[`, ']']
      if (value.length === 0) {
        return inspectionEarlyReturn(`${braces[0]}]`)
      }
      extrasType = ARRAY_EXTRAS_TYPE
      formatter  = showTypedArray
    } else {
      noIterator = true
    }
  }
  if (noIterator) {
    keys   = getKeys(value, context.showHidden)
    braces = ['{', '}']
    if (constructor === 'Object') {
      if (tag !== '') {
        braces[0] = `${getPrefix(constructor, tag, 'Object')}{`
      }
      if (keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(`${braces[0]}}`)
      }
    } else if (typeof value === 'function') {
      base = getFunctionBase(value, constructor, tag)
      if (keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(base)
      }
    } else if (isRegExp(value)) {
      base         = RegExp.prototype.toString.call(constructor !== null ? value : new RegExp(value))
      const prefix = getPrefix(constructor, tag, 'RegExp')
      if (prefix !== 'RegExp ') {
        base = `${prefix}${base}`
      }
      if (keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(base)
      }
    } else if (isDate(value)) {
      base         = Number.isNaN(value.getTime()) ? value.toString() : value.toISOString()
      const prefix = getPrefix(constructor, tag, 'Date')
      if (prefix !== 'Date ') {
        base = `${prefix}${base}`
      }
      if (keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(base)
      }
    } else if (isAnyArrayBuffer(value)) {
      const arrayType = isArrayBuffer(value) ? 'ArrayBuffer' : 'SharedArrayBuffer'
      const prefix    = getPrefix(constructor, tag, arrayType)
      if (typedArray === undefined) {
        formatter = showArrayBuffer
      } else if (keys.length === 0 && C.isEmpty(protoProps)) {
        return inspectionEarlyReturn(prefix + `{ byteLength: ${_showNumber(context, value.byteLength)} }`)
      }
      braces[0] = `${prefix}{`
      keys.unshift('byteLength')
    } else if (isDataView(value)) {
      braces[0] = `${getPrefix(constructor, tag, 'DataView')}{`
      keys.unshift('byteLength', 'byteOffset', 'buffer')
    } else if (isPromise(value)) {
      return inspectionEarlyReturn(`${getPrefix(constructor, tag, 'Promise')}{}`)
    } else if (isWeakSet(value)) {
      return inspectionEarlyReturn(`${getPrefix(constructor, tag, 'WeakSet')}{}`)
    } else if (isWeakMap(value)) {
      return inspectionEarlyReturn(`${getPrefix(constructor, tag, 'WeakMap')}{}`)
    } else if (Z.isZ(value)) {
      return constructor !== null ? inspectionEarlyReturn(`Z (${constructor}) {}`) : inspectionEarlyReturn('Z {}')
    } else {
      if (keys.length === 0) {
        return inspectionEarlyReturn(`${getPrefix(constructor, tag, 'Object')}{}`)
      }
      braces[0] = `${getPrefix(constructor, tag, 'Object')}{`
    }
  }
  return inspectionInfo({
    constructor,
    keys,
    tag,
    base,
    formatter,
    braces,
    noIterator,
    extrasType,
    protoProps
  })
}

/**
 * Retrieves information on the unknown value and processes that info to convert the value
 * into a human-readable, formatted string
 */
function showRaw(value: object, typedArray?: string): ShowComputation {
  return pipe(
    Z.gets((context: ShowContext) => tuple(context, getInspectionInfo(context, value, typedArray))),
    Z.chain(([context, info]) => {
      if (info._tag === 'InspectionInfo' && context.recurseTimes > context.depth) {
        let constructorName = getPrefix(info.constructor, info.tag, 'Object').slice(0, -1)
        if (info.constructor !== null) {
          constructorName = `[${constructorName}]`
        }
        return Z.update((context: ShowContext) =>
          context.copy({ recurseTimes: context.recurseTimes - 1, currentDepth: context.currentDepth - 1 })
        )['*>'](Z.pure(context.stylize(constructorName, 'special')))
      }
      if (info._tag === 'InspectionEarlyReturn') {
        return Z.pure(info.shown)
      } else {
        return pipe(
          Z.update((context: ShowContext) => {
            context.seen.push(value)
            return context
          }),
          Z.crossSecond(
            Z.defer(() => {
              let keys: ShowComputationChunk
              let indices: ShowComputationChunk
              let base: ShowComputation
              let braces: [string, string]
              let extrasType: number
              switch (info._tag) {
                case 'InspectionInfo': {
                  base       = Z.pure(info.base)
                  keys       = pipe(
                    C.from(info.keys),
                    C.mapA(Z.Applicative)((key) => showProperty(value, key, info.extrasType)),
                    Z.crossWith(
                      C.mapA_(Z.Applicative)(info.protoProps, (key) => showProperty(value, key, PROTO_TYPE)),
                      C.concat_
                    )
                  )
                  indices    = info.formatter(value)
                  braces     = info.braces
                  extrasType = info.extrasType
                  break
                }
                case 'InspectionExternal': {
                  const externalComputation = info.computation
                  if (externalComputation._tag === 'Primitive') {
                    return Z.getsZ((context) =>
                      externalComputation.computation['<$>'](
                        str.replace(/\n/g, `\n${' '.repeat(context.indentationLevel)}`)
                      )
                    )
                  } else {
                    base       = externalComputation.base || Z.pure('')
                    keys       = externalComputation.keys || Z.pure(C.empty())
                    indices    = externalComputation.indices || Z.pure(C.empty())
                    braces     = externalComputation.braces || ['', '']
                    extrasType = externalComputation.extrasType || OBJECT_TYPE
                  }
                  break
                }
              }

              const output      = Z.crossWith_(indices, keys, C.concat_)
              const baseWithRef = Z.getsZ((context: ShowContext) =>
                pipe(
                  HM.get_(context.circular, value),
                  O.match(
                    () => base,
                    (index) =>
                      base['<$>']((base) => {
                        const ref = context.stylize(`<ref *${index}>`, 'special')
                        return base === '' ? ref : `${ref} ${base}`
                      })
                  )
                )
              )

              return pipe(
                Z.update((_: ShowContext) =>
                  _.copy({ recurseTimes: context.recurseTimes + 1, currentDepth: _.recurseTimes + 1 })
                ),
                Z.crossSecond(output),
                Z.cross(baseWithRef),
                Z.chain(([output, base]) =>
                  Z.modify((context) => {
                    const res = reduceToSingleString(context, output, base, braces, extrasType, value)

                    const budget    = context.budget[context.indentationLevel] || 0
                    const newLength = budget + res.length
                    let newBudget   = { ...context.budget, [context.indentationLevel]: newLength }
                    let newContext

                    if (newLength > 2 ** 27) {
                      newContext = context.copy({ budget: newBudget, depth: -1 })
                    } else {
                      newContext = context.copy({ budget: newBudget })
                    }
                    return [res, newContext]
                  })
                ),
                Z.crossFirst(
                  Z.update((context: ShowContext) => {
                    context.seen.pop()
                    return context.copy({
                      recurseTimes: context.recurseTimes - 1
                    })
                  })
                )
              )
            })
          )
        )
      }
    })
  )
}

/**
 * Converts a Chunk of strings containing the formatted keys/values of the original value
 * into a single formatted string
 */
function reduceToSingleString(
  context: ShowContext,
  input: Chunk<string>,
  base: string,
  braces: [string, string],
  extrasType: number,
  value?: any
): string {
  let output = input
  if (context.compact >= 1) {
    const entries = output.length
    if (extrasType === ARRAY_EXTRAS_TYPE && entries > 6) {
      output = groupElements(context, output, value)
    }
    if (context.currentDepth - context.recurseTimes < context.compact && entries === output.length) {
      const start = output.length + context.indentationLevel + braces[0].length + base.length + 10
      if (isBelowBreakLength(context, output, start, base)) {
        return `${base ? `${base} ` : ''}${braces[0]} ${C.join_(output, ', ')} ${braces[1]}`
      }
    }
  }
  const indentation = `\n${' '.repeat(context.indentationLevel)}`
  return (
    `${base ? `${base} ` : ''}${braces[0]}${indentation}  ` +
    `${C.join_(output, `,${indentation}  `)}${indentation}${braces[1]}`
  )
}

function isBelowBreakLength(context: ShowContext, input: Chunk<string>, start: number, base: string): boolean {
  let totalLength = input.length + start
  if (totalLength + input.length > context.breakLength) {
    return false
  }
  for (let i = 0; i < input.length; i++) {
    if (context.colors) {
      totalLength += removeColors(C.unsafeGet_(input, i)).length
    } else {
      totalLength += C.unsafeGet_(input, i).length
    }
    if (totalLength > context.breakLength) {
      return false
    }
  }
  return base === '' || !base.includes('\n')
}

function removeColors(str: string): string {
  return str.replace(colorRegExp, '')
}

function showSet(value: Set<unknown>): ShowComputationChunk {
  return pipe(
    Z.update((_: ShowContext) => _.copy({ indentationLevel: _.indentationLevel + 2 })),
    Z.crossSecond(It.mapAChunk_(Z.Applicative)(value, _show)),
    Z.crossFirst(Z.update((_: ShowContext) => _.copy({ indentationLevel: _.indentationLevel - 2 })))
  )
}

function showMap(value: Map<unknown, unknown>): ShowComputationChunk {
  return pipe(
    Z.update((_: ShowContext) => _.copy({ indentationLevel: _.indentationLevel + 2 })),
    Z.crossSecond(
      It.mapAChunk_(Z.Applicative)(value, ([k, v]) => Z.crossWith_(_show(k), _show(v), (k, v) => `${k} => ${v}`))
    ),
    Z.crossFirst(
      Z.update((_: ShowContext) =>
        _.copy({
          indentationLevel: _.indentationLevel - 2
        })
      )
    )
  )
}

function showTypedArray(value: TypedArray): ShowComputationChunk {
  return Z.getsZ((context) =>
    Z.defer(() => {
      const maxLength = Math.min(Math.max(0, context.maxArrayLength), value.length)
      const remaining = value.length - maxLength
      let output      = C.empty<string>()

      const elementFormatter: (context: ShowContext, _: any) => string =
        value.length > 0 && typeof value[0] === 'number' ? _showNumber : _showBigInt
      for (let i = 0; i < maxLength; ++i) {
        output = output[':+'](elementFormatter(context, value[i]))
      }
      if (remaining > 0) {
        output = output[':+'](`... ${remaining} more item${pluralize(remaining)}`)
      }
      if (context.showHidden) {
        return pipe(
          Z.update((_: ShowContext) => _.copy({ indentationLevel: _.indentationLevel + 2 })),
          Z.crossSecond(
            Z.pure(output)['>>=']((output) =>
              pipe(
                C.make('BYTES_PER_ELEMENT', 'length', 'byteLength', 'byteOffset', 'buffer'),
                C.mapA(Z.Applicative)((key) => _show(value[key])['<$>']((shown) => `[${key}]: ${shown}`)),
                Z.map((shownKeys) => output['++'](shownKeys))
              )
            )
          ),
          Z.crossFirst(Z.update((_: ShowContext) => _.copy({ indentationLevel: _.indentationLevel - 2 })))
        )
      } else {
        return Z.pure(output)
      }
    })
  )
}

function showArrayBuffer(value: ArrayBuffer | SharedArrayBuffer): ShowComputationChunk {
  return Z.gets((context: ShowContext) => {
    let buffer
    try {
      buffer = new Uint8Array(value)
    } catch {
      return C.single('(detached)')
    }

    let str         = hex(buffer.slice(0, Math.min(context.maxArrayLength, buffer.length)))
      .replace(/(.{2})/g, '$1 ')
      .trim()
    const remaining = buffer.length - context.maxArrayLength

    if (remaining > 0) {
      str += ` ... ${remaining} more byte${pluralize(remaining)}`
    }

    return C.single(`[Uint8Contents]: <${str}>`)
  })
}

const maxEntries = 2 ** 32 - 2

function showSpecialArray(
  value: ReadonlyArray<unknown>,
  maxLength: number,
  currentComputation: ShowComputationChunk,
  currentIndex: number,
  currentLength: number
): ShowComputationChunk {
  return Z.getsZ((context) => {
    const keys       = Object.keys(value)
    let index        = currentIndex
    let i            = currentIndex
    let outputLength = currentLength
    let computation  = currentComputation
    for (; i < keys.length && outputLength < maxLength; i++) {
      const key = keys[i]
      const tmp = +key
      if (tmp > maxEntries) {
        break
      }
      if (`${index}` !== key) {
        if (!numberRegExp.test(key)) {
          break
        }
        const emptyItems = tmp - index
        const message    = `<${emptyItems} empty item${pluralize(emptyItems)}>`
        computation      = Z.map_(computation, C.append(context.stylize(message, 'undefined')))
        outputLength++
        index = tmp
        if (outputLength === maxLength) {
          break
        }
      }
      computation = Z.crossWith_(computation, showProperty(value, key, ARRAY_TYPE), C.append_)
      outputLength++
      index++
    }
    const remaining = value.length - index
    if (outputLength !== maxLength) {
      if (remaining > 0) {
        computation = Z.map_(
          computation,
          C.append(context.stylize(`<${remaining} empty item${pluralize(remaining)}>`, 'undefined'))
        )
      }
    } else if (remaining > 0) {
      computation = Z.map_(computation, C.append(`... ${remaining} more item${pluralize(remaining)}`))
    }
    return computation
  })
}

function showArray(value: ReadonlyArray<unknown>): ShowComputationChunk {
  return pipe(
    Z.gets((context: ShowContext) => {
      let chunk       = C.from(value)
      const valLen    = chunk.length
      const len       = Math.min(Math.max(0, context.maxArrayLength), valLen)
      const remaining = valLen - len
      chunk           = C.take_(chunk, len)
      return tuple(remaining, chunk)
    }),
    Z.chain(([remaining, chunk]) => {
      let computation = Z.pure(C.empty()) as ShowComputationChunk
      for (let i = 0; i < chunk.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(value, i)) {
          return showSpecialArray(value, chunk.length, computation, i, i)
        }
        computation = Z.crossWith_(computation, showProperty(value, i, ARRAY_TYPE), C.append_)
      }
      if (remaining > 0) {
        computation = Z.map_(computation, C.append(`... ${remaining} more item${pluralize(remaining)}`))
      }
      return computation
    })
  )
}

function showChunk(value: Chunk<unknown>): ShowComputationChunk {
  return pipe(
    Z.gets((context: ShowContext) => {
      const valLen    = value.length
      const len       = Math.min(Math.max(0, context.maxArrayLength), valLen)
      const remaining = valLen - len
      let chunk       = C.take_(value, len)
      return tuple(remaining, chunk)
    }),
    Z.chain(([remaining, chunk]) =>
      pipe(
        C.mapA_(Z.Applicative)(chunk, _show),
        Z.map((chunk) => (remaining > 0 ? chunk[':+'](`... ${remaining} more item${pluralize(remaining)}`) : chunk))
      )
    )
  )
}

export function showProperty(
  value: object,
  key: PropertyKey,
  type: number,
  desc?: PropertyDescriptor
): ShowComputation {
  return Z.getsZ((context: ShowContext) =>
    pipe(
      Z.defer(() => {
        let descriptor = desc || Object.getOwnPropertyDescriptor(value, key) || { value: value[key], enumerable: true }

        if (isDefined(descriptor.value)) {
          const diff = context.compact !== true || (type !== OBJECT_TYPE && type !== PROTO_TYPE) ? 2 : 3
          return pipe(
            Z.update((_: ShowContext): ShowContext => _.copy({ indentationLevel: _.indentationLevel + diff })),
            Z.crossSecond(_show(descriptor.value)),
            Z.chain((shown: string) =>
              Z.gets((_: ShowContext) =>
                diff === 3 && _.breakLength < getStringWidth(shown, _.colors)
                  ? tuple(descriptor, `\n${' '.repeat(_.indentationLevel)}`, shown)
                  : tuple(descriptor, ' ', shown)
              )
            ),
            Z.crossFirst(
              Z.update((_: ShowContext): ShowContext => _.copy({ indentationLevel: _.indentationLevel - diff }))
            )
          )
        } else if (isDefined(descriptor.get)) {
          return Z.pure(tuple(descriptor, ' ', `[${descriptor.set ? 'Getter/Settter' : 'Getter'}]`))
        } else if (isDefined(descriptor.set)) {
          return Z.pure(tuple(descriptor, ' ', 'Setter'))
        } else {
          return Z.pure(tuple(descriptor, ' ', 'undefined'))
        }
      }),
      Z.map(([descriptor, extra, shown]) => {
        if (type === ARRAY_TYPE) {
          return shown
        }

        let name: string

        if (isSymbol(key)) {
          const tmp = key.toString().replace(strEscapeSequencesReplacer, escapeFn)
          name      = `[${context.stylize(tmp, 'symbol')}]`
        } else if (key === '__proto__') {
          name = "['__proto__']"
        } else if (descriptor.enumerable === false) {
          const tmp = key.toString().replace(strEscapeSequencesReplacer, escapeFn)
          name      = `[${tmp}]`
        } else if (keyStrRegExp.test(String(key))) {
          name = String(key)
        } else {
          name = context.stylize(strEscape(String(key)), 'string')
        }

        if (type === PROTO_TYPE) {
          return context.stylize(`${name}:${extra}${shown}`, 'dim')
        }

        return `${name}:${extra}${shown}`
      })
    )
  )
}

/**
 * Groups the formatted elements of an array-like structure into chunks limited by the
 * maximum character width set in the context
 */
function groupElements(context: ShowContext, input: Chunk<string>, value?: unknown): Chunk<string> {
  let totalLength      = 0
  let maxLength        = 0
  let i                = 0
  const outputLength   = context.maxArrayLength < input.length ? input.length - 1 : input.length
  const separatorSpace = 2
  const dataLength     = Array(outputLength)
  let output           = input
  for (; i < outputLength; i++) {
    const len     = getStringWidth(C.unsafeGet_(input, i), context.colors)
    dataLength[i] = len
    totalLength  += len + separatorSpace
    if (maxLength < len) {
      maxLength = len
    }
  }
  const actualMax = maxLength + separatorSpace
  if (
    actualMax * 3 + context.indentationLevel < context.breakLength &&
    (totalLength / actualMax > 5 || maxLength <= 6)
  ) {
    const approxCharHeights = 2.5
    const averageBias       = Math.sqrt(actualMax - totalLength / input.length)
    const biasedMax         = Math.max(actualMax - 3 - averageBias, 1)
    const columns           = Math.min(
      // Ideally a square should be drawn. We expect a character to be about 2.5
      // times as high as wide. This is the area formula to calculate a square
      // which contains n rectangles of size `actualMax * approxCharHeights`.
      // Divide that by `actualMax` to receive the correct number of columns.
      // The added bias increases the columns for short entries.
      Math.round(Math.sqrt(approxCharHeights * biasedMax * outputLength) / biasedMax),
      // Do not exceed the breakLength.
      Math.floor((context.breakLength - context.indentationLevel) / actualMax),
      // Limit array grouping for small `compact` modes as the user requested
      // minimal grouping.
      Number(context.compact) * 4,
      // Limit the columns to a maximum of fifteen.
      15
    )
    if (columns <= 1) {
      return input
    }
    let tmp             = C.empty<string>()
    const maxLineLength = []
    for (let i = 0; i < columns; i++) {
      let lineMaxLength = 0
      for (let k = i; k < output.length; k += columns) {
        if (dataLength[k] > lineMaxLength) {
          lineMaxLength = dataLength[k]
        }
      }
      lineMaxLength   += separatorSpace
      maxLineLength[i] = lineMaxLength
    }

    let order = String.prototype.padStart
    if (value !== undefined && isArray(value)) {
      for (let i = 0; i < output.length; i++) {
        if (typeof value[i] !== 'number' && typeof value[i] !== 'bigint') {
          order = String.prototype.padEnd
          break
        }
      }
    }
    for (let i = 0; i < outputLength; i += columns) {
      const max = Math.min(i + columns, outputLength)
      let str   = ''
      let k     = i
      for (; k < max - 1; k++) {
        const padding = maxLineLength[k - i] + C.unsafeGet_(output, k).length - dataLength[k]
        str          += order.call(`${C.unsafeGet_(output, k)}, `, padding, ' ')
      }
      if (order === String.prototype.padStart) {
        const padding = maxLineLength[k - i] + C.unsafeGet_(output, k).length - dataLength[k] - separatorSpace
        str          += C.unsafeGet_(output, k).padStart(padding, ' ')
      } else {
        str += C.unsafeGet_(output, k)
      }
      tmp = tmp[':+'](str)
    }
    if (context.maxArrayLength < output.length) {
      tmp = tmp[':+'](C.unsafeGet_(output, outputLength))
    }
    output = tmp
  }
  return output
}

type Primitive = string | number | boolean | bigint | symbol

function _showPrimitive(context: ShowContext, value: Primitive): string {
  switch (typeof value) {
    case 'string':
      return _showString(context, value)
    case 'number':
      return _showNumber(context, value)
    case 'boolean':
      return _showBoolean(context, value)
    case 'bigint':
      return _showBigInt(context, value)
    case 'symbol':
      return _showSymbol(context, value)
  }
}

function _showString(context: ShowContext, value: string): string {
  let result  = value
  let trailer = ''
  if (value.length > context.maxStringLength) {
    const remaining = value.length - context.maxStringLength
    result          = result.slice(0, context.maxStringLength)
    trailer         = `... ${remaining} more character${pluralize(remaining)}`
  }
  if (
    context.compact !== true &&
    result.length > 16 &&
    result.length > context.breakLength - context.indentationLevel - 4
  ) {
    return pipe(
      result,
      str.split(/(?<=\n)/),
      A.map((line) => context.stylize(strEscape(line), 'string')),
      A.join(` +\n${' '.repeat(context.indentationLevel + 2)}`),
      str.append(trailer)
    )
  }
  return context.stylize(strEscape(value), 'string') + trailer
}

function _showNumber(context: ShowContext, value: number): string {
  return context.stylize(value.toString(10), 'number')
}

function _showBoolean(context: ShowContext, value: boolean): string {
  return context.stylize(value === true ? 'true' : 'false', 'boolean')
}

function _showBigInt(context: ShowContext, value: bigint): string {
  return context.stylize(`${value.toString()}n`, 'bigint')
}

function _showSymbol(context: ShowContext, value: symbol): string {
  return context.stylize(value.toString(), 'symbol')
}
