import ts from 'typescript'

import { getOptimizeTags } from './util'

export default function identity(program: ts.Program, opts?: { identity?: boolean }) {
  const identityOn = !(opts?.identity === false)
  const checker    = program.getTypeChecker()
  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory
      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node)) {
            const optimizeTags = getOptimizeTags(checker, node)

            if (optimizeTags.has('identity') && node.arguments.length === 1 && !ts.isSpreadElement(node.arguments[0])) {
              return ts.visitEachChild(node, visitor, ctx).arguments[0]
            }
            if (optimizeTags.has('remove')) {
              return factory.createVoidZero()
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return identityOn ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
