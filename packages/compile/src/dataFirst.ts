import ts from 'typescript'

function isInternal(n: ts.Node): n is ts.Node & { __sig_tags: string[] } {
  return '__sig_tags' in n
}

export default function dataFirst(program: ts.Program) {
  const checker = program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            ts.isCallExpression(node.expression.expression) &&
            node.expression.expression.arguments.length === 1 &&
            ts.isPropertyAccessExpression(node.expression.expression.expression)
          ) {
            let dataFirstTag: string | undefined
            const symbol = checker.getTypeAtLocation(node.expression.expression.expression).getSymbol()
            if (isInternal(node.expression)) {
              dataFirstTag = node.expression.__sig_tags
                .filter((x) => x.includes('dataFirst'))
                .map((x) => x.replace('dataFirst ', ''))?.[0]
            } else {
              dataFirstTag = symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(e, (t): t is ts.JSDocTag => t.tagName?.getText() === 'dataFirst')
                      .map((e) => e.comment)
                      .filter((e): e is string => typeof e === 'string')
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), [])[0]
            }
            if (dataFirstTag) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  factory.createCallExpression(
                    dataFirstTag === 'self'
                      ? node.expression.expression.expression
                      : factory.createPropertyAccessExpression(
                          node.expression.expression.expression.expression,
                          factory.createIdentifier(dataFirstTag)
                        ),
                    undefined,
                    [node.expression.expression.arguments[0]]
                  ),
                  undefined,
                  [...node.arguments, ...node.expression.arguments]
                ),
                visitor,
                ctx
              )
            }
          }
          if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            isInternal(node.expression)
          ) {
            const dataFirstConstraintTag = node.expression.__sig_tags
              .filter((x) => x.includes('dataFirstConstraint'))
              .map((x) => x.replace('dataFirstConstraint ', ''))?.[0]

            const dataFirstTag = node.expression.__sig_tags
              .filter((x) => x.includes('dataFirst'))
              .map((x) => x.replace('dataFirst ', ''))?.[0]

            if (dataFirstConstraintTag) {
              // no transform
            } else if (dataFirstTag) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  dataFirstTag === 'self'
                    ? node.expression.expression
                    : factory.createPropertyAccessExpression(
                        node.expression.expression.expression,
                        factory.createIdentifier(dataFirstTag)
                      ),
                  undefined,
                  [node.arguments[0]!, ...node.expression.arguments]
                ),
                visitor,
                ctx
              )
            }
          } else if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            node.arguments.length === 1 &&
            !ts.isSpreadElement(node.arguments[0]!)
          ) {
            const symbol = checker.getTypeAtLocation(node.expression.expression).getSymbol()

            let dataFirstTag: string | undefined

            if (isInternal(node)) {
              dataFirstTag = node.__sig_tags
                .filter((x) => x.includes('dataFirst'))
                .map((x) => x.replace('dataFirst ', ''))?.[0]
            } else {
              dataFirstTag = symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(e, (t): t is ts.JSDocTag => t.tagName?.getText() === 'dataFirst')
                      .map((e) => e.comment)
                      .filter((e): e is string => typeof e === 'string')
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry), [])[0]
            }

            if (dataFirstTag) {
              return ts.visitEachChild(
                factory.createCallExpression(
                  dataFirstTag === 'self'
                    ? node.expression.expression
                    : factory.createPropertyAccessExpression(
                        node.expression.expression.expression,
                        factory.createIdentifier(dataFirstTag)
                      ),
                  undefined,
                  [node.arguments[0]!, ...node.expression.arguments]
                ),
                visitor,
                ctx
              )
            }
          } else if (
            ts.isCallExpression(node) &&
            ts.isCallExpression(node.expression) &&
            node.arguments.length === 1 &&
            !ts.isSpreadElement(node.arguments[0]!)
          ) {
            const tags = signatureTags(checker.getResolvedSignature(node.expression))

            if (tags['dataFirst'] && tags['dataFirst'].includes('self')) {
              return ts.visitEachChild(
                factory.createCallExpression(node.expression.expression, undefined, [
                  node.arguments[0]!,
                  ...node.expression.arguments
                ]),
                visitor,
                ctx
              )
            }
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}

function signatureTags(signature: ts.Signature | undefined) {
  const tags: Record<string, (string | undefined)[]> = {}

  for (const entry of signature?.getJsDocTags().map((t) => [t.name, t.text] as const) || []) {
    if (!tags[entry[0]]) {
      tags[entry[0]] = []
    }
    tags[entry[0]!]!.push(entry[1]?.[0].text)
  }
  return tags
}
