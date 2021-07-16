import path from 'path'
import ts from 'typescript'
import { inspect } from 'util'

export default function tag(
  program: ts.Program,
  opts?: {
    moduleMap?: Record<string, [string, string, string]>
  }
) {
  const checker = program.getTypeChecker()

  const moduleMap     = opts?.moduleMap || {}
  const moduleMapKeys = Object.keys(moduleMap).map((k) => [k, new RegExp(k)] as const)

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (ts.isCallExpression(node)) {
            const declaration = checker.getResolvedSignature(node)?.getDeclaration()

            const tag = declaration
              ? (() => {
                  try {
                    return ts.getAllJSDocTags(declaration, (t): t is ts.JSDocTag => t.tagName.getText() === 'tag')[0]
                  } catch {
                    return undefined
                  }
                })()
              : undefined

            if (tag) {
              const { fileName } = sourceFile
              let finalName      = path.relative(process.cwd(), fileName)

              for (const k of moduleMapKeys) {
                const matches = finalName.match(k[1])
                if (matches) {
                  let [moduleName, baseName, fileName] = moduleMap[k[0]]
                  for (let j = 1; j < matches.length; j += 1) {
                    fileName = fileName.replace('$' + j, matches[j])
                  }
                  finalName = `${moduleName}/${fileName.replace('.ts', '')}`
                  break
                }
              }

              if (finalName.startsWith('./') || finalName.startsWith('../')) {
                finalName = finalName
                  .split('/')
                  .filter((s) => s !== '.' && s !== '..')
                  .join('/')
              }

              const serviceName = factory.createUniqueName(node.typeArguments![0].getText()).text

              return factory.createCallExpression(node.expression, node.typeArguments, [
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(factory.createIdentifier('Symbol'), 'for'),
                  undefined,
                  [factory.createStringLiteral(`${finalName}/${serviceName}`, false)]
                )
              ])
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}
