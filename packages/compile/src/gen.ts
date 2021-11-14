import ts from 'typescript'

function isInternal(n: ts.Node): n is ts.Node & { __sig_tags: string[] } {
  return '__sig_tags' in n
}

function handleStatement(
  s: ts.Statement,
  factory: ts.NodeFactory,
  moduleIdentifier: ts.Identifier,
  ctx: ts.TransformationContext,
  nodes: Array<readonly [ts.Expression, [ts.Expression, ts.ParameterDeclaration | undefined]]>
): ts.Expression | undefined {
  if (ts.isVariableStatement(s)) {
    const declarations = s.declarationList.declarations
    for (const d of declarations) {
      if (
        d.initializer &&
        ts.isYieldExpression(d.initializer) &&
        d.initializer.expression &&
        ts.isCallExpression(d.initializer.expression)
      ) {
        nodes.push([
          factory.createPropertyAccessExpression(moduleIdentifier, 'chain_'),
          [
            factory.createCallExpression(
              factory.createPropertyAccessExpression(moduleIdentifier, '__adapter'),
              undefined,
              [
                d.initializer.expression.arguments[0],
                ...(d.initializer.expression.arguments[1] ? [d.initializer.expression.arguments[1]] : [])
              ]
            ),
            factory.createParameterDeclaration(undefined, undefined, undefined, d.name)
          ]
        ])
      } else if (d.initializer) {
        const hasYieldResult: Box<boolean> = { value: false }
        const visitor = hasYieldVisitor(hasYieldResult, ctx)
        ts.visitEachChild(d.initializer, visitor, ctx)
        if (hasYieldResult.value) {
          throw 'unhandled statement, cannot optimize'
        }
        nodes.push([
          factory.createPropertyAccessExpression(moduleIdentifier, 'chain_'),
          [
            factory.createCallExpression(factory.createPropertyAccessExpression(moduleIdentifier, 'pure'), undefined, [
              d.initializer
            ]),
            factory.createParameterDeclaration(undefined, undefined, undefined, d.name)
          ]
        ])
      } else {
        throw 'unhandled statement, cannot optimize'
      }
    }
    return undefined
  } else if (
    ts.isExpressionStatement(s) &&
    ts.isYieldExpression(s.expression) &&
    s.expression.expression &&
    ts.isCallExpression(s.expression.expression)
  ) {
    nodes.push([
      factory.createPropertyAccessExpression(moduleIdentifier, 'chain_'),
      [
        factory.createCallExpression(factory.createPropertyAccessExpression(moduleIdentifier, '__adapter'), undefined, [
          s.expression.expression.arguments[0],
          ...(s.expression.expression.arguments[1] ? [s.expression.expression.arguments[1]] : [])
        ]),
        undefined
      ]
    ])
    return undefined
  } else if (ts.isReturnStatement(s)) {
    if (
      s.expression &&
      ts.isYieldExpression(s.expression) &&
      s.expression.expression &&
      ts.isCallExpression(s.expression.expression)
    ) {
      return s.expression.expression.arguments[0]
    } else if (s.expression) {
      const hasYieldResult: Box<boolean> = { value: false }
      const visitor = hasYieldVisitor(hasYieldResult, ctx)
      ts.visitEachChild(s.expression, visitor, ctx)
      if (hasYieldResult.value) {
        throw 'unhandled statement, cannot optimize'
      }
      return factory.createCallExpression(factory.createPropertyAccessExpression(moduleIdentifier, 'pure'), undefined, [
        s.expression
      ])
    } else {
      return factory.createCallExpression(factory.createPropertyAccessExpression(moduleIdentifier, 'pure'), undefined, [
        factory.createVoidZero()
      ])
    }
  }
  throw 'unhandled statement, cannot optimize'
}

interface Box<T> {
  value: T
}

const hasYieldVisitor =
  (result: Box<boolean>, ctx: ts.TransformationContext): ts.Visitor =>
  (node) => {
    if (ts.isYieldExpression(node)) {
      result.value = true
    }
    return ts.visitEachChild(node, hasYieldVisitor(result, ctx), ctx)
  }

export default function gen(program: ts.Program, opts?: { optigen?: boolean }) {
  const optigen = !(opts?.optigen === false)
  const checker = program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.arguments[0] &&
            ts.isFunctionExpression(node.arguments[0]) &&
            node.arguments[0].asteriskToken &&
            ts.isAsteriskToken(node.arguments[0].asteriskToken)
          ) {
            let genTag: string | undefined
            const symbol = checker.getTypeAtLocation(node.expression).getSymbol()
            if (isInternal(node.expression)) {
              genTag = node.expression.__sig_tags.filter((x) => x.includes('gen'))[0]
            } else {
              genTag = symbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(e, (t): t is ts.JSDocTag => t.tagName?.getText() === 'gen')
                      .map((e) => e.tagName.text)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry))[0]
            }
            if (genTag) {
              const moduleIdentifier = node.expression.expression
              const statements       = node.arguments[0].body.statements
              if (statements.length > 0) {
                // [chain_, [effect, binding | undefined]]
                const nodes: Array<readonly [ts.Expression, [ts.Expression, ts.ParameterDeclaration | undefined]]> = []
                let ret: ts.Expression | undefined = undefined
                for (const s of statements) {
                  try {
                    ret = handleStatement(s, factory, moduleIdentifier, ctx, nodes)
                  } catch {
                    return node
                  }
                }

                const go = (outNode: ts.Expression, index: number): ts.Expression => {
                  const x = nodes[index]
                  if (x) {
                    const [expr, [effect, param]] = x
                    return factory.createCallExpression(expr, undefined, [
                      effect,
                      factory.createArrowFunction(
                        undefined,
                        undefined,
                        param ? [param] : [],
                        undefined,
                        undefined,
                        go(outNode, index + 1)
                      )
                    ])
                  } else {
                    return outNode!
                  }
                }
                return go(
                  ret ??
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(moduleIdentifier, 'pure'),
                      undefined,
                      [factory.createVoidZero()]
                    ),
                  0
                )
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }
        return optigen ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
