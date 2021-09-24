import path from 'path'
import ts from 'typescript'

import { checkRegionAt, getTagsAndEntries, getTrace, normalize, traceChild } from './transformer-util'
import { optimizePipe } from './unpipe'

export default function rewrite(
  program: ts.Program,
  opts?: { rewrite?: boolean, tracing?: boolean, moduleMap?: Record<string, [string, string, string]> }
) {
  const checker = program.getTypeChecker()

  const rewriteOn     = !(opts?.rewrite === false)
  const moduleMap     = opts?.moduleMap || {}
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
        const tracingOn      = !(opts?.tracing === false) && isModule

        const tracedIdentifier    = factory.createPropertyAccessExpression(tracing, traced)
        const traceFromIdentifier = factory.createPropertyAccessExpression(tracing, traceFrom)

        const regions = sourceFullText
          .split('\n')
          .map((line, i) => {
            const x: [boolean, number][] = []
            const m = line.matchAll(/tracing: (on|off)/g)
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
            let [moduleName, baseName, fileName] = moduleMap[k[0]]
            for (let j = 1; j < matches.length; j += 1) {
              fileName = fileName.replace('$' + j, matches[j])
            }
            finalName = `(${moduleName}): ${baseName}/${fileName}`
            break
          }
        }

        const traceChild_ = traceChild(factory, checker, visitor, fileVar, tracedIdentifier)
        const getTrace_   = getTrace(factory, sourceFile)

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
                  const { entries, tags } = getTagsAndEntries(symbol)

                  if (tags['trace'] && tags['trace'].includes('getter')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace_(node.name, fileVar, 'start')
                    ])
                  }
                }
                return rewritten
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
                  const { tags, entries } = getTagsAndEntries(signature)

                  // x.y(z)((a) => a.b) ==> mod.y_(z)((a) => a.b)
                  const rewritten = ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createCallExpression(
                        factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                        undefined,
                        node.expression.arguments.map((argNode, i) =>
                          traceChild_(argNode, i, tags, traceFromIdentifier, getTrace_)
                        )
                      ),
                      undefined,
                      [
                        node.expression.expression.expression,
                        ...node.arguments.map((x, i) => traceChild_(x, i, tags, traceFromIdentifier, getTrace_))
                      ]
                    ),
                    visitor,
                    ctx
                  )

                  if (tags['trace'] && tags['trace'].includes('call')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace_(node.expression, fileVar, 'end')
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
            const symbol    = checker.getSymbolAtLocation(node.expression)
            let isTracing   = false
            try {
              const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.expression.getEnd())
              isTracing       = tracingOn && checkRegionAt(regions, nodeStart.line, nodeStart.character)
            } catch {
              isTracing = false
            }

            if (signature) {
              const sigTags  = signature.getJsDocTags().map((_) => `${_.name} ${_.text?.map((_) => _.text).join(' ')}`)
              const exprTags =
                symbol?.getJsDocTags().map((_) => `${_.name} ${_.text?.map((_) => _.text).join(' ')}`) || []

              const rewriteStatic = [...sigTags, ...exprTags].filter((_) => _.startsWith('rewriteStatic'))[0]
              const rewrite       = !rewriteStatic && sigTags.filter((_) => _.startsWith('rewrite'))[0]

              if (rewriteStatic) {
                const [fn, mod] = rewriteStatic.match(/rewriteStatic (.*) from "(.*)"/)!.splice(1)
                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName('module'))
                }

                if (isTracing) {
                  const { tags, entries } = getTagsAndEntries(signature)

                  const rewritten = ts.visitEachChild(
                    factory.updateCallExpression(
                      node,
                      factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                      undefined,
                      node.arguments.map((argNode, i) => traceChild_(argNode, i, tags, traceFromIdentifier, getTrace_))
                    ),
                    visitor,
                    ctx
                  )

                  if (tags['trace'] && tags['trace'].includes('call')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace_(node.expression, fileVar, 'end')
                    ])
                  } else {
                    return rewritten
                  }
                } else {
                  return ts.visitEachChild(
                    factory.updateCallExpression(
                      node,
                      factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                      undefined,
                      node.arguments
                    ),
                    visitor,
                    ctx
                  )
                }
              }

              if (rewrite) {
                const [fn, mod] = rewrite.match(/rewrite (.*) from "(.*)"/)!.splice(1)

                if (mod === 'smart:identity') {
                  return ts.visitNode(node.expression.expression, visitor)
                }

                if (mod === 'smart:pipe') {
                  if (node.arguments.findIndex((xx) => ts.isSpreadElement(xx)) === -1) {
                    const visited = ts.visitEachChild(node, visitor, ctx)
                    return optimizePipe([node.expression.expression, ...visited.arguments], factory)
                  }
                }

                if (!mods.has(mod!)) {
                  mods.set(mod!, factory.createUniqueName('module'))
                }

                if (isTracing) {
                  const { tags, entries } = getTagsAndEntries(signature)

                  const rewritten = ts.visitEachChild(
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(mods.get(mod!)!, factory.createIdentifier(fn!)),
                      undefined,
                      [
                        node.expression.expression,
                        ...node.arguments.map((argNode, i) =>
                          traceChild_(argNode, i, tags, traceFromIdentifier, getTrace_)
                        )
                      ]
                    ),
                    visitor,
                    ctx
                  )

                  if (tags['trace'] && tags['trace'].includes('call')) {
                    return factory.createCallExpression(tracedIdentifier, undefined, [
                      rewritten,
                      getTrace_(node.expression, fileVar, 'end')
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

        if (rewriteOn) {
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
        } else {
          return sourceFile
        }
      }
    }
  }
}
