import ts from 'typescript'

import { getOptimizeTags } from './util'

export default function unflow(
  program: ts.Program,
  opts?: {
    flow?: boolean
  }
) {
  const flowOn  = !(opts?.flow === false)
  const checker = program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            const optimizeTags = getOptimizeTags(checker, node)

            if (flowOn && optimizeTags.has('flow')) {
              const shortcut =
                checker
                  .getTypeAtLocation(node.arguments[0])
                  .getCallSignatures()
                  .find(
                    (s) =>
                      s.getParameters().length > 1 ||
                      s.getParameters().some((p) => p.valueDeclaration?.getText().includes('...'))
                  ) == null

              const id = factory.createIdentifier('args')

              if (node.arguments.find(ts.isSpreadElement) == null) {
                return factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      shortcut ? undefined : factory.createToken(ts.SyntaxKind.DotDotDotToken),
                      id,
                      undefined,
                      undefined,
                      undefined
                    )
                  ],
                  undefined,
                  factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  optimizeFlow(
                    ts.visitEachChild(node, visitor, ctx).arguments,
                    factory,
                    shortcut ? id : factory.createSpreadElement(id)
                  )
                )
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return flowOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}

function optimizeFlow(args: ArrayLike<ts.Expression>, factory: ts.NodeFactory, x: ts.Expression): ts.Expression {
  if (args.length === 1) {
    return factory.createCallExpression(args[0], undefined, [x])
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [optimizeFlow(newArgs, factory, x)])
}
