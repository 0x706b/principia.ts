import * as path from 'path'
import ts from 'typescript'

import { checkRegionAt, getTrace, normalize, traceChild } from './transformer-util'

function findExisting(
  sourceFile: ts.SourceFile,
  ctx: ts.TransformationContext,
  importTracingFrom: string,
  finalName: string
): { tracingFound: ts.Identifier | undefined, fileNodeFound: ts.Identifier | undefined } {
  let tracingFound  = undefined as undefined | ts.Identifier
  let fileNodeFound = undefined as undefined | ts.Identifier
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
  return { tracingFound, fileNodeFound }
}

export default function trace(
  program: ts.Program,
  opts?: {
    tracing?: boolean
    moduleMap?: Record<string, [string, string, string]>
  }
) {
  const tracingOn = !(opts?.tracing === false)
  const checker   = program.getTypeChecker()

  const moduleMap     = opts?.moduleMap || {}
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

        const { fileName } = sourceFile
        let finalName      = path.relative(process.cwd(), fileName)

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

        finalName = normalize(finalName)

        const { fileNodeFound, tracingFound } = findExisting(sourceFile, ctx, importTracingFrom, finalName)

        const fileVar = fileNodeFound || factory.createUniqueName('fileName')
        const tracing = tracingFound || factory.createUniqueName('tracing')

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

        const traceChild_ = traceChild(factory, checker, visitor, fileVar, tracedIdentifier)
        const getTrace_   = getTrace(factory, sourceFile)

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
            const tags: Record<string, (string | undefined)[]> = {}

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
                  getTrace_(node.expression, fileVar, 'end')
                ]),
                undefined,
                node.arguments.map((argNode, i) => traceChild_(argNode, i, tags, traceFromIdentifier, getTrace_))
              )
            }

            return factory.updateCallExpression(
              node,
              ts.visitNode(node.expression, visitor),
              node.typeArguments,
              node.arguments.map((x, i) => traceChild_(x, i, tags, traceFromIdentifier, getTrace_))
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
