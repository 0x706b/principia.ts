import path from 'path'
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

export default function rewrite(
  _program: ts.Program,
  _opts?: { rewrite?: boolean, tracing?: boolean, moduleMap?: Record<string, string> }
) {
  const checker = _program.getTypeChecker()

  const moduleMap     = _opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  const importTracingFrom = '@principia/compile/util'

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const sourceFullText = sourceFile.getFullText()
        const mods           = new Map<string, ts.Identifier>()
        const traced         = factory.createIdentifier('traceCall')
        const fileVar        = factory.createIdentifier('fileName')
        const tracing        = factory.createIdentifier('tracing')
        const traceFrom      = factory.createIdentifier('traceFrom')
        const isModule       = sourceFile.statements.find((s) => ts.isImportDeclaration(s)) != null
        const tracingOn      = !(_opts?.tracing === false) && isModule

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

        const { fileName } = sourceFile

        let finalName = path.relative(process.cwd(), fileName)

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
          if (ts.isPropertyAccessExpression(node)) {
            const symbol = checker.getSymbolAtLocation(node)

            let isTracing = false
            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.expression.getEnd())
              isTracing       = tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (symbol) {
              const rewrite = symbol
                .getJsDocTags()
                .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(' ')}`)
                .filter((_) => _.startsWith('rewriteGetter'))[0]

              if (rewrite) {
                const [fn, mod] = rewrite.match(/rewriteGetter (.*) from "(.*)"/)!.splice(1)

                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName('module'))
                }

                const id = mods.get(mod!)!

                const rewritten = ts.visitEachChild(
                  factory.createCallExpression(
                    factory.createPropertyAccessExpression(id, factory.createIdentifier(fn!)),
                    undefined,
                    [node.expression]
                  ),
                  visitor,
                  ctx
                )

                if (isTracing) {
                  const entries: (readonly [string, string | undefined])[] =
                    symbol.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []
                  const tags: Record<string, (string | undefined)[]>       = {}

                  for (const entry of entries) {
                    if (!tags[entry[0]]) {
                      tags[entry[0]] = []
                    }
                    tags[entry[0]].push(entry[1])
                  }

                  if (tags['trace'] && tags['trace'].includes('getter')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace(node.name, 'start')
                    ])
                  } else {
                    return rewritten
                  }
                }
              }
            }
          }
          if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            (ts.isPropertyAccessExpression(node.expression.expression) ||
              ts.isElementAccessExpression(node.expression.expression))
          ) {
            const signature = checker.getResolvedSignature(node.expression)
            let isTracing   = false
            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.expression.getEnd())
              isTracing       = tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (signature) {
              const rewrite = signature
                .getJsDocTags()
                .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(' ')}`)
                .filter((_) => _.startsWith('rewrite'))[0]

              if (rewrite) {
                const [fn, mod] = rewrite.match(/rewriteConstraint (.*) from "(.*)"/)!.splice(1)

                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName('module'))
                }

                if (isTracing) {
                  const entries: (readonly [string, string | undefined])[] =
                    signature?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []
                  const tags: Record<string, (string | undefined)[]>       = {}

                  for (const entry of entries) {
                    if (!tags[entry[0]]) {
                      tags[entry[0]] = []
                    }
                    tags[entry[0]].push(entry[1])
                  }
                  // x.y(z)((a) => a.b) ==> mod.y_(z)((a) => a.b)
                  const rewritten = ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createCallExpression(
                        factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                        undefined,
                        [
                          // node.expression.expression.expression,
                          ...node.expression.arguments.map((x, i) =>
                            traceChild(tags, i, factory, traceFromIdentifier, getTrace, x)
                          )
                        ]
                      ),
                      undefined,
                      [
                        node.expression.expression.expression,
                        ...node.arguments.map((x, i) => traceChild(tags, i, factory, traceFromIdentifier, getTrace, x))
                      ]
                    ),
                    visitor,
                    ctx
                  )

                  if (tags['trace'] && tags['trace'].includes('call')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace(node.expression, 'end')
                    ])
                  } else {
                    return rewritten
                  }
                } else {
                  return ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createCallExpression(
                        factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                        undefined,
                        [...node.expression.arguments]
                      ),
                      undefined,
                      [node.expression.expression.expression, ...node.arguments]
                    ),
                    visitor,
                    ctx
                  )
                }
              }
            }
          }
          if (
            ts.isCallExpression(node) &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
          ) {
            const signature = checker.getResolvedSignature(node)
            let isTracing   = false
            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.expression.getEnd())
              isTracing       = tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (signature) {
              const rewrite = signature
                .getJsDocTags()
                .map((_) => `${_.name} ${_.text?.map((_) => _.text).join(' ')}`)
                .filter((_) => _.startsWith('rewrite'))[0]

              if (rewrite) {
                const [fn, mod] = rewrite.match(/rewrite (.*) from "(.*)"/)!.splice(1)

                if (mod === 'smart:identity') {
                  return ts.visitNode(node.expression.expression, visitor)
                }

                if (mod === 'smart:pipe') {
                  if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                    const visited = ts.visitEachChild(node, visitor, ctx)
                    return optimisePipe([node.expression.expression, ...visited.arguments], factory)
                  }
                }

                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName('module'))
                }

                if (isTracing) {
                  const entries: (readonly [string, string | undefined])[] =
                    signature?.getJsDocTags().map((t) => [t.name, t.text?.[0].text] as const) || []
                  const tags: Record<string, (string | undefined)[]>       = {}

                  for (const entry of entries) {
                    if (!tags[entry[0]]) {
                      tags[entry[0]] = []
                    }
                    tags[entry[0]].push(entry[1])
                  }

                  const rewritten = ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                      undefined,
                      [
                        node.expression.expression,
                        ...node.arguments.map((x, i) => traceChild(tags, i, factory, traceFromIdentifier, getTrace, x))
                      ]
                    ),
                    visitor,
                    ctx
                  )

                  if (tags['trace'] && tags['trace'].includes('call')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace(node.expression, 'end')
                    ])
                  } else {
                    return rewritten
                  }
                } else {
                  return ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                      undefined,
                      [node.expression.expression, ...node.arguments]
                    ),
                    visitor,
                    ctx
                  )
                }
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        const fileNode = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                fileVar,
                undefined,
                undefined,
                factory.createStringLiteral(normalize(finalName))
              )
            ],
            ts.NodeFlags.Const
          )
        )

        const visited = ts.visitNode(sourceFile, visitor)

        const imports = Array.from(mods).map(([mod, id]) =>
          factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(false, undefined, factory.createNamespaceImport(id)),
            factory.createStringLiteral(mod)
          )
        )

        if (tracingOn) {
          return factory.updateSourceFile(visited, [
            factory.createImportDeclaration(
              undefined,
              undefined,
              factory.createImportClause(false, undefined, factory.createNamespaceImport(tracing)),
              factory.createStringLiteral(importTracingFrom)
            ),
            ...imports,
            fileNode,
            ...visited.statements
          ])
        }

        return factory.updateSourceFile(visited, [...imports, ...visited.statements])
      }
    }
  }
}

function optimisePipe(args: ArrayLike<ts.Expression>, factory: ts.NodeFactory): ts.Expression {
  if (args.length === 1) {
    return args[0]
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [optimisePipe(newArgs, factory)])
}
