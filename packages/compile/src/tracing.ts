import * as path from 'path'
import ts from 'typescript'

function checkRegionAt(regions: (readonly [[boolean, number][], number])[], line: number, char: number) {
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

function normalize(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  const hasNonAscii          = /[^\u0000-\u0080]+/.test(path) // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return path
  }

  return path.replace(/\\/g, '/')
}

export default function tracer(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    moduleMap?: Record<string, string>
  }
) {
  const tracingOn = !(_opts?.tracing === false)
  const checker   = _program.getTypeChecker()

  const moduleMap     = _opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const sourceFullText = sourceFile.getFullText()
        const traced         = factory.createIdentifier('traceCall')
        const traceFrom      = factory.createIdentifier('traceFrom')

        const importTracingFrom = '@principia/compile/util'

        const isModule = sourceFile.statements.find((s) => ts.isImportDeclaration(s)) != null

        if (!isModule) {
          return sourceFile
        }

        let tracingFound  = undefined as undefined | ts.Identifier
        let fileNodeFound = undefined as undefined | ts.Identifier

        const { fileName } = sourceFile
        let finalName      = path.relative(process.cwd(), fileName)

        for (const k of moduleMapKeys) {
          const matches = finalName.match(k[1])
          if (matches) {
            let patchedName = moduleMap[k[0]]
            for (let j = 1; j < matches.length; j += 1) {
              patchedName = patchedName.replace('$' + j, matches[j])
            }
            finalName = patchedName
            break
          }
        }

        finalName = normalize(finalName)

        function finder(node: ts.Node): ts.VisitResult<ts.Node> {
          if (
            ts.isImportDeclaration(node) &&
            node.importClause &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === importTracingFrom &&
            node.importClause.namedBindings &&
            ts.isNamespaceImport(node.importClause.namedBindings)
          ) {
            tracingFound = node.importClause.namedBindings.name
          }
          if (
            ts.isVariableDeclaration(node) &&
            node.initializer &&
            ts.isStringLiteral(node.initializer) &&
            node.initializer.text === finalName &&
            ts.isIdentifier(node.name)
          ) {
            fileNodeFound = node.name
          }
          return ts.visitEachChild(node, finder, ctx)
        }

        ts.visitNode(sourceFile, finder)

        const fileVar = fileNodeFound || factory.createUniqueName('fileName')
        const tracing = tracingFound || factory.createUniqueName('tracing')

        const tracedIdentifier    = factory.createPropertyAccessExpression(tracing, traced)
        const traceFromIdentifier = factory.createPropertyAccessExpression(tracing, traceFrom)

        const regions = sourceFullText
          .split('\n')
          .map((line, i) => {
            const x: [boolean, number][] = []
            const m                      = line.matchAll(/tracing: (on|off)/g)
            for (const k of m) {
              if (k && k.index) {
                x.push([k[1] === 'on', k.index])
              }
            }
            return [x, i] as const
          })
          .filter(([x]) => x.length > 0)

        function getTrace(node: ts.Node, pos: 'start' | 'end') {
          const nodeStart = sourceFile.getLineAndCharacterOfPosition(pos === 'start' ? node.getStart() : node.getEnd())
          return factory.createBinaryExpression(
            fileVar,
            factory.createToken(ts.SyntaxKind.PlusToken),
            factory.createStringLiteral(`:${nodeStart.line + 1}:${nodeStart.character + 1}`)
          )
        }

        function traceChild(
          tags: Record<string, (string | undefined)[]>,
          i: number,
          factory: ts.NodeFactory,
          traceFromIdentifier: ts.PropertyAccessExpression,
          getTrace: (node: ts.Node, pos: 'start' | 'end') => ts.BinaryExpression,
          x: ts.Expression
        ): ts.Expression {
          const symbol = checker.getSymbolAtLocation(x)

          const entries: (readonly [string, string | undefined])[] =
            symbol?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []

          const tagsX: Record<string, (string | undefined)[]> = {}

          for (const entry of entries) {
            if (!tagsX[entry[0]]) {
              tagsX[entry[0]] = []
            }
            tagsX[entry[0]].push(entry[1])
          }

          const z = ts.visitNode(x, visitor)

          const y =
            tagsX['trace'] && tagsX['trace'].includes('call')
              ? factory.createCallExpression(tracedIdentifier, undefined, [z, getTrace(x, 'end')])
              : z

          const child =
            tags['trace'] && tags['trace'].includes(`${i}`)
              ? factory.createCallExpression(traceFromIdentifier, undefined, [getTrace(x, 'start'), y])
              : y

          return child
        }

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          let isTracing

          try {
            const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart())
            isTracing       = tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
          } catch {
            isTracing = false
          }

          if (ts.isCallExpression(node) && isTracing) {
            const signature = checker.getResolvedSignature(node)

            const entries: (readonly [string, string | undefined])[] =
              signature?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []
            const tags: Record<string, (string | undefined)[]>       = {}

            for (const entry of entries) {
              if (!tags[entry[0]]) {
                tags[entry[0]] = []
              }
              tags[entry[0]].push(entry[1])
            }

            if (signature && tags['trace'] && tags['trace'].includes('call')) {
              return factory.createCallExpression(
                factory.createCallExpression(tracedIdentifier, undefined, [
                  ts.visitNode(node.expression, visitor),
                  getTrace(node.expression, 'end')
                ]),
                undefined,
                node.arguments.map((x, i) => traceChild(tags, i, factory, traceFromIdentifier, getTrace, x))
              )
            }

            return factory.updateCallExpression(
              node,
              ts.visitNode(node.expression, visitor),
              node.typeArguments,
              node.arguments.map((x, i) => traceChild(tags, i, factory, traceFromIdentifier, getTrace, x))
            )
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        if (tracingOn) {
          const visited = ts.visitEachChild(sourceFile, visitor, ctx)

          const pre = [] as ts.Statement[]

          if (!tracingFound) {
            pre.push(
              factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(false, undefined, factory.createNamespaceImport(tracing)),
                factory.createStringLiteral(importTracingFrom)
              )
            )
          }
          if (!fileNodeFound) {
            pre.push(
              factory.createVariableStatement(
                undefined,
                factory.createVariableDeclarationList(
                  [
                    factory.createVariableDeclaration(
                      fileVar,
                      undefined,
                      undefined,
                      factory.createStringLiteral(finalName)
                    )
                  ],
                  ts.NodeFlags.Const
                )
              )
            )
          }

          return factory.updateSourceFile(visited, [...pre, ...visited.statements])
        }

        return sourceFile
      }
    }
  }
}
