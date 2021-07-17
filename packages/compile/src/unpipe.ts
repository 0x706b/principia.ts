import ts from 'typescript'

import { getOptimizeTags } from './util'

export default function unpipe(
  program: ts.Program,
  opts?: {
    pipe?: boolean
  }
) {
  const pipeOn  = !(opts?.pipe === false)
  const checker = program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            const optimizeTags = getOptimizeTags(checker, node)

            if (pipeOn && optimizeTags.has('pipe')) {
              if (node.arguments.findIndex((arg) => ts.isSpreadElement(arg)) === -1) {
                return optimizePipe(ts.visitEachChild(node, visitor, ctx).arguments, factory)
              }
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return pipeOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}

/**
 * @internal
 */
export function optimizePipe(args: ArrayLike<ts.Expression>, factory: ts.NodeFactory): ts.Expression {
  if (args.length === 1) {
    return args[0]
  }

  const newArgs: ts.Expression[] = []
  for (let i = 0; i < args.length - 1; i += 1) {
    newArgs.push(args[i])
  }

  return factory.createCallExpression(args[args.length - 1], undefined, [optimizePipe(newArgs, factory)])
}
