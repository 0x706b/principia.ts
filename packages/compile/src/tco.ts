import * as ts from 'typescript'

function isInternal(n: ts.Node): n is ts.Node & { __sig_tags: string[] } {
  return '__sig_tags' in n
}

function toIdentifier(node: ts.BindingName): Array<ts.Identifier> {
  if (ts.isIdentifier(node)) {
    return [node]
  } else {
    return node.elements
      .flatMap((elem: ts.BindingElement | ts.ArrayBindingElement) =>
        ts.isBindingElement(elem) ? toIdentifier(elem.name) : undefined
      )
      .filter((elem): elem is ts.Identifier => !!elem)
  }
}

function tailRecToAssignments(
  funcIdentifierType: ts.Type,
  paramNames: Array<ts.Identifier>,
  tempNames: Array<ts.Identifier>,
  checker: ts.TypeChecker,
  factory: ts.NodeFactory,
  context: ts.TransformationContext
): (node: ts.Node) => ts.VisitResult<ts.Node> {
  return (node) => {
    try {
      if (ts.isReturnStatement(node) && node.expression && ts.isCallExpression(node.expression)) {
        if (ts.isIdentifier(node.expression.expression)) {
          const callIdentifierType = checker.getTypeAtLocation(node.expression.expression)
          if (callIdentifierType === funcIdentifierType) {
            const tempAssignments: Array<ts.ExpressionStatement> = []
            const assignments: Array<ts.ExpressionStatement>     = []
            for (let i = 0, p = 0; i < node.expression.arguments.length; i++) {
              const expr = node.expression.arguments[i]
              if (ts.isObjectLiteralExpression(expr) && expr.properties.every(ts.isPropertyAssignment)) {
                for (let j = 0; j < expr.properties.length; j++) {
                  tempAssignments.push(
                    factory.createExpressionStatement(
                      factory.createBinaryExpression(
                        tempNames[p + j],
                        factory.createToken(ts.SyntaxKind.EqualsToken),
                        expr.properties[j].initializer
                      )
                    )
                  )
                  assignments.push(
                    factory.createExpressionStatement(
                      factory.createBinaryExpression(
                        paramNames[p + j],
                        factory.createToken(ts.SyntaxKind.EqualsToken),
                        tempNames[p + j]
                      )
                    )
                  )
                }
                p += expr.properties.length
              } else {
                tempAssignments.push(
                  factory.createExpressionStatement(
                    factory.createBinaryExpression(tempNames[p], factory.createToken(ts.SyntaxKind.EqualsToken), expr)
                  )
                )
                assignments.push(
                  factory.createExpressionStatement(
                    factory.createBinaryExpression(
                      paramNames[p],
                      factory.createToken(ts.SyntaxKind.EqualsToken),
                      tempNames[p]
                    )
                  )
                )
                p += 1
              }
            }
            const newStatements: Array<ts.Statement> = tempAssignments.concat(assignments)
            newStatements.push(factory.createContinueStatement())
            return newStatements
          }
        }
      }
      return ts.visitEachChild(
        node,
        tailRecToAssignments(funcIdentifierType, paramNames, tempNames, checker, factory, context),
        context
      )
    } catch (e) {
      return node
    }
  }
}

function createTempVariables(
  node: ts.FunctionDeclaration,
  factory: ts.NodeFactory
): [Array<ts.Identifier>, Array<ts.VariableDeclaration>] {
  return node.parameters.reduce(
    (b, param) => {
      const names = toIdentifier(param.name)
      for (const name of names) {
        const uniqueName = factory.createUniqueName(name.text)
        b[0].push(uniqueName)
        b[1].push(factory.createVariableDeclaration(uniqueName, undefined, undefined, name))
      }
      return b
    },
    [[] as Array<ts.Identifier>, [] as Array<ts.VariableDeclaration>]
  )
}

export default function tco(program: ts.Program) {
  const checker = program.getTypeChecker()
  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory
      return (sourceFile: ts.SourceFile) => {
        const visitor: ts.Visitor = (node) => {
          if (ts.isFunctionDeclaration(node) && node.name && node.body) {
            const funcType   = checker.getTypeAtLocation(node)
            const funcSymbol = funcType.getSymbol()
            let tailrecTag: string | undefined
            if (isInternal(node)) {
              tailrecTag = node.__sig_tags.filter((tag) => tag.includes('tailrec'))[0]
            } else {
              tailrecTag = funcSymbol
                ?.getDeclarations()
                ?.map((e) => {
                  try {
                    return ts
                      .getAllJSDocTags(e, (t): t is ts.JSDocTag => t.tagName?.getText() === 'tailrec')
                      .map((e) => e.tagName.text)
                  } catch {
                    return []
                  }
                })
                .reduce((flatten, entry) => flatten.concat(entry))[0]
            }

            if (tailrecTag) {
              const [tempVariableNames, tempVariableDeclarations] = createTempVariables(node, factory)
              const funcIdentifierType = checker.getTypeAtLocation(node.name)
              try {
                const newDeclaration = ts.visitEachChild(
                  node,
                  tailRecToAssignments(
                    funcIdentifierType,
                    node.parameters.flatMap((p) => toIdentifier(p.name)),
                    tempVariableNames,
                    checker,
                    factory,
                    ctx
                  ),
                  ctx
                )
                return factory.createFunctionDeclaration(
                  node.decorators,
                  node.modifiers,
                  node.asteriskToken,
                  node.name,
                  node.typeParameters,
                  node.parameters,
                  node.type,
                  factory.createBlock(
                    [
                      factory.createVariableStatement(
                        undefined,
                        factory.createVariableDeclarationList(tempVariableDeclarations)
                      ),
                      factory.createWhileStatement(factory.createTrue(), newDeclaration.body!)
                    ],
                    true
                  )
                )
              } catch {
                return node
              }
            }
          }
          return node
        }
        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    }
  }
}
