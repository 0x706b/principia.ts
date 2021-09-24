import ts from 'typescript'

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
    tags: Record<string, ReadonlyArray<string | undefined>>,
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

export function getTagsAndEntries(signature: ts.Signature | ts.Symbol | undefined): {
  entries: ReadonlyArray<readonly [string, string | undefined]>
  tags: Record<string, ReadonlyArray<string | undefined>>
} {
  const entries: (readonly [string, string | undefined])[] =
    signature?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []
  const tags: Record<string, (string | undefined)[]> = {}

  for (const entry of entries) {
    if (!tags[entry[0]]) {
      tags[entry[0]] = []
    }
    tags[entry[0]].push(entry[1])
  }
  return { entries, tags }
}
