import ts from 'typescript'

import { isTracingEnabled } from './global'

export const tracingSymbol = '$trace'

let currentTraceCall: string | undefined

/**
 * @untrace traceCall
 */
export function traceCall<F extends Function>(f: F, trace: string | undefined): F {
  if (!isTracingEnabled() || !trace) {
    return f
  }
  // @ts-expect-error
  return (...args: any[]) => {
    currentTraceCall = trace
    const res        = f(...args)
    currentTraceCall = undefined
    return res
  }
}

/**
 * @untrace accessCallTrace
 */
export function accessCallTrace(): string | undefined {
  if (!isTracingEnabled() || !currentTraceCall) {
    return undefined
  }
  const callTrace: any = currentTraceCall
  currentTraceCall     = undefined
  return callTrace
}

/**
 * @untrace traceFrom
 */
export function traceFrom<F extends Function>(g: string | undefined, f: F): F {
  if (!f[tracingSymbol]) {
    if (g && isTracingEnabled()) {
      const h          = (...args: any[]) => f(...args)
      h[tracingSymbol] = g
      return h as any
    }
  }
  return f
}

/**
 * @untrace traceAs
 */
export function traceAs<F extends Function>(g: any, f: F): F {
  if (g && g[tracingSymbol] && isTracingEnabled()) {
    const h          = (...args: any[]) => f(...args)
    h[tracingSymbol] = g[tracingSymbol]
    return h as any
  }
  return f
}

/**
 * @internal
 */
export function checkRegionAt(regions: (readonly [[boolean, number][], number])[], line: number, char: number) {
  const previous = regions.filter(([_, __]) => __ <= line)
  const last     = previous[previous.length - 1]
  let on         = true

  if (last) {
    if (last[1] === line) {
      const prevInLine = last[0].filter(([_, c]) => c <= char)

      if (prevInLine.length > 0) {
        on = prevInLine[prevInLine.length - 1][0]
      }
    } else {
      const prevOfAll = last[0]

      if (prevOfAll.length > 0) {
        on = prevOfAll[prevOfAll.length - 1][0]
      }
    }
  }

  return on
}

/**
 * @internal
 */
export function normalize(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  const hasNonAscii          = /[^\u0000-\u0080]+/.test(path) // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return path
  }

  return path.replace(/\\/g, '/')
}

/**
 * @internal
 */
export const getTrace =
  (factory: ts.NodeFactory, sourceFile: ts.SourceFile) =>
  (node: ts.Node, fileVar: ts.Identifier, pos: 'start' | 'end') => {
    const nodeStart = sourceFile.getLineAndCharacterOfPosition(pos === 'start' ? node.getStart() : node.getEnd())
    return factory.createBinaryExpression(
      fileVar,
      factory.createToken(ts.SyntaxKind.PlusToken),
      factory.createStringLiteral(`:${nodeStart.line + 1}:${nodeStart.character + 1}`)
    )
  }

/**
 * @internal
 */
export const traceChild =
  (
    factory: ts.NodeFactory,
    checker: ts.TypeChecker,
    visitor: ts.Visitor,
    fileVar: ts.Identifier,
    tracedIdentifier: ts.PropertyAccessExpression
  ) =>
  (
    argNode: ts.Expression,
    argIndex: number,
    tags: Record<string, (string | undefined)[]>,
    traceFromIdentifier: ts.PropertyAccessExpression,
    getTrace: (node: ts.Node, fileVar: ts.Identifier, pos: 'start' | 'end') => ts.BinaryExpression
  ): ts.Expression => {
    const symbol = checker.getSymbolAtLocation(argNode)

    const entries: (readonly [string, string | undefined])[] =
      symbol?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []

    const tagsX: Record<string, (string | undefined)[]> = {}

    for (const entry of entries) {
      if (!tagsX[entry[0]]) {
        tagsX[entry[0]] = []
      }
      tagsX[entry[0]].push(entry[1])
    }

    const z = ts.visitNode(argNode, visitor)

    const y =
      tagsX['trace'] && tagsX['trace'].includes('call')
        ? factory.createCallExpression(tracedIdentifier, undefined, [z, getTrace(argNode, fileVar, 'end')])
        : z

    const child =
      tags['trace'] && tags['trace'].includes(`${argIndex}`)
        ? factory.createCallExpression(traceFromIdentifier, undefined, [getTrace(argNode, fileVar, 'start'), y])
        : y

    return child
  }

export function getOptimizeTags(checker: ts.TypeChecker, node: ts.CallExpression): Set<string> {
  const symbol = checker.getTypeAtLocation(node.expression).getSymbol()

  const overloadDeclarations = checker.getResolvedSignature(node)?.getDeclaration()

  const optimizeTagsOverload = overloadDeclarations
    ? (() => {
        try {
          return ts
            .getAllJSDocTags(overloadDeclarations, (t): t is ts.JSDocTag => t.tagName.getText() === 'optimize')
            .map((e) => e.comment)
            .filter((s): s is string => s != null)
        } catch {
          return undefined
        }
      })()
    : undefined

  const optimizeTagsMain =
    symbol
      ?.getDeclarations()
      ?.map((e) => {
        try {
          return ts
            .getAllJSDocTags(e, (t): t is ts.JSDocTag => t.tagName?.getText() === 'optimize')
            .map((e) => e.comment)
            .filter((c): c is string => typeof c === 'string')
        } catch {
          return []
        }
      })
      .reduce((flatten, entry) => flatten.concat(entry), []) || []

  return new Set([...optimizeTagsMain, ...(optimizeTagsOverload || [])])
}

export * from './global'
