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

interface Box<T> {
  value: T
}

function tcoVisitor(
  funcIdentifierType: ts.Type,
  paramNames: Array<ts.Identifier>,
  tempNames: Array<ts.Identifier>,
  recurseIdentifier: ts.PropertyAccessExpression,
  resultIdentifier: ts.Identifier,
  checker: ts.TypeChecker,
  factory: ts.NodeFactory,
  context: ts.TransformationContext,
  crossedFunctionBoundaryInner: boolean,
  crossedFunctionBoundary: Box<boolean>
): (node: ts.Node) => ts.VisitResult<ts.Node> {
  return (node) => {
    if (ts.isArrowFunction(node)) {
      crossedFunctionBoundary.value = true
      if (ts.isBlock(node.body)) {
        return factory.createArrowFunction(
          node.modifiers,
          node.typeParameters,
          node.parameters,
          node.type,
          node.equalsGreaterThanToken,
          ts.visitEachChild(
            node.body,
            tcoVisitor(
              funcIdentifierType,
              paramNames,
              tempNames,
              recurseIdentifier,
              resultIdentifier,
              checker,
              factory,
              context,
              true,
              crossedFunctionBoundary
            ),
            context
          )
        )
      } else {
        return factory.createArrowFunction(
          node.modifiers,
          node.typeParameters,
          node.parameters,
          node.type,
          node.equalsGreaterThanToken,
          ts.visitEachChild(
            factory.createBlock([factory.createReturnStatement(node.body)]),

            tcoVisitor(
              funcIdentifierType,
              paramNames,
              tempNames,
              recurseIdentifier,
              resultIdentifier,
              checker,
              factory,
              context,
              true,
              crossedFunctionBoundary
            ),
            context
          )
        )
      }
    } else if (ts.isReturnStatement(node)) {
      if (node.expression) {
        if (ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
          const callIdentifierType = checker.getTypeAtLocation(node.expression.expression)
          if (callIdentifierType === funcIdentifierType) {
            let tempAssignments: ts.Expression = undefined!
            let assignments: ts.Expression     = undefined!
            for (let i = 0, p = 0; i < node.expression.arguments.length; i++) {
              const expr = node.expression.arguments[i]
              if (ts.isObjectLiteralExpression(expr) && expr.properties.every(ts.isPropertyAssignment)) {
                for (let j = 0; j < expr.properties.length; j++) {
                  const t = factory.createAssignment(tempNames[p + j], expr.properties[j].initializer)
                  if (!tempAssignments) {
                    tempAssignments = t
                  } else {
                    tempAssignments = factory.createComma(tempAssignments, t)
                  }
                  const a = factory.createAssignment(paramNames[p + j], tempNames[p + j])
                  if (!assignments) {
                    assignments = a
                  } else {
                    assignments = factory.createComma(assignments, a)
                  }
                }
                p += expr.properties.length
              } else {
                const t = factory.createAssignment(tempNames[p], expr)
                if (!tempAssignments) {
                  tempAssignments = t
                } else {
                  tempAssignments = factory.createComma(tempAssignments, t)
                }
                const a = factory.createAssignment(paramNames[p], tempNames[p])
                if (!assignments) {
                  assignments = a
                } else {
                  assignments = factory.createComma(assignments, a)
                }
                p += 1
              }
            }
            const expr = factory.createComma(tempAssignments, assignments)
            if (crossedFunctionBoundaryInner) {
              return factory.createReturnStatement(
                factory.createParenthesizedExpression(factory.createComma(expr, recurseIdentifier))
              )
            } else {
              return [
                factory.createParenthesizedExpression(expr),
                factory.createExpressionStatement(factory.createAssignment(resultIdentifier, recurseIdentifier)),
                factory.createContinueStatement()
              ]
            }
          }
        } else if (ts.isConditionalExpression(node.expression)) {
          return ts.visitEachChild(
            factory.createIfStatement(
              node.expression.condition,
              factory.createBlock([factory.createReturnStatement(node.expression.whenTrue)]),
              factory.createBlock([factory.createReturnStatement(node.expression.whenFalse)])
            ),
            tcoVisitor(
              funcIdentifierType,
              paramNames,
              tempNames,
              recurseIdentifier,
              resultIdentifier,
              checker,
              factory,
              context,
              crossedFunctionBoundaryInner,
              crossedFunctionBoundary
            ),
            context
          )
        } else if (ts.isParenthesizedExpression(node.expression)) {
          return ts.visitNode(
            factory.createReturnStatement(node.expression.expression),
            tcoVisitor(
              funcIdentifierType,
              paramNames,
              tempNames,
              recurseIdentifier,
              resultIdentifier,
              checker,
              factory,
              context,
              crossedFunctionBoundaryInner,
              crossedFunctionBoundary
            )
          )
        }
      }

      if (crossedFunctionBoundaryInner) {
        return factory.createReturnStatement(
          ts.visitEachChild(
            node.expression,
            tcoVisitor(
              funcIdentifierType,
              paramNames,
              tempNames,
              recurseIdentifier,
              resultIdentifier,
              checker,
              factory,
              context,
              crossedFunctionBoundaryInner,
              crossedFunctionBoundary
            ),
            context
          )
        )
      } else {
        return [
          factory.createExpressionStatement(
            factory.createAssignment(
              resultIdentifier,
              ts.visitEachChild(
                node.expression || factory.createVoidZero(),
                tcoVisitor(
                  funcIdentifierType,
                  paramNames,
                  tempNames,
                  recurseIdentifier,
                  resultIdentifier,
                  checker,
                  factory,
                  context,
                  crossedFunctionBoundaryInner,
                  crossedFunctionBoundary
                ),
                context
              )
            )
          ),
          factory.createContinueStatement()
        ]
      }
    } else {
      return ts.visitEachChild(
        node,
        tcoVisitor(
          funcIdentifierType,
          paramNames,
          tempNames,
          recurseIdentifier,
          resultIdentifier,
          checker,
          factory,
          context,
          crossedFunctionBoundaryInner,
          crossedFunctionBoundary
        ),
        context
      )
    }
  }
}

function createTempVariables(
  node: ts.FunctionDeclaration | ts.ArrowFunction,
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
        const recurse             = factory.createUniqueName('recurse')
        const recurseIdentifier   = factory.createPropertyAccessExpression(recurse, 'RECURSE')
        const visitor: ts.Visitor = (node) => {
          if (ts.isVariableDeclaration(node) && node.name && node.initializer && ts.isArrowFunction(node.initializer)) {
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
              const resultIdentifier = factory.createUniqueName('result')
              const [tempVariableNames, tempVariableDeclarations] = createTempVariables(node.initializer, factory)
              const funcIdentifierType = checker.getTypeAtLocation(node.name)
              try {
                const crossedFunctionBoundary = { value: false }
                const loopBody                = ts.visitEachChild(
                  ts.isBlock(node.initializer.body)
                    ? node.initializer.body
                    : factory.createBlock([factory.createReturnStatement(node.initializer.body)]),
                  tcoVisitor(
                    funcIdentifierType,
                    node.initializer.parameters.flatMap((p) => toIdentifier(p.name)),
                    tempVariableNames,
                    recurseIdentifier,
                    resultIdentifier,
                    checker,
                    factory,
                    ctx,
                    false,
                    crossedFunctionBoundary
                  ),
                  ctx
                )
                tempVariableDeclarations.push(
                  factory.createVariableDeclaration(resultIdentifier, undefined, undefined, recurseIdentifier)
                )
                return factory.createVariableDeclaration(
                  node.name,
                  node.exclamationToken,
                  node.type,
                  factory.createArrowFunction(
                    node.initializer.modifiers,
                    node.initializer.typeParameters,
                    node.initializer.parameters,
                    node.initializer.type,
                    node.initializer.equalsGreaterThanToken,
                    factory.createBlock(
                      [
                        factory.createVariableStatement(
                          undefined,
                          factory.createVariableDeclarationList(tempVariableDeclarations)
                        ),
                        factory.createWhileStatement(
                          factory.createBinaryExpression(
                            resultIdentifier,
                            factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                            recurseIdentifier
                          ),
                          loopBody
                        ),
                        factory.createReturnStatement(resultIdentifier)
                      ],
                      true
                    )
                  )
                )
              } catch (e) {
                console.log(e)
                return node
              }
            } else {
              return ts.visitEachChild(node, visitor, ctx)
            }
          } else if (ts.isFunctionDeclaration(node) && node.name && node.body) {
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
              const resultIdentifier = factory.createUniqueName('result')
              const [tempVariableNames, tempVariableDeclarations] = createTempVariables(node, factory)
              const funcIdentifierType = checker.getTypeAtLocation(node.name)
              try {
                const crossedFunctionBoundary = { value: false }
                const loopBody                = ts.visitEachChild(
                  node,
                  tcoVisitor(
                    funcIdentifierType,
                    node.parameters.flatMap((p) => toIdentifier(p.name)),
                    tempVariableNames,
                    recurseIdentifier,
                    resultIdentifier,
                    checker,
                    factory,
                    ctx,
                    false,
                    crossedFunctionBoundary
                  ),
                  ctx
                )
                tempVariableDeclarations.push(
                  factory.createVariableDeclaration(resultIdentifier, undefined, undefined, recurseIdentifier)
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
                      factory.createWhileStatement(
                        factory.createBinaryExpression(
                          resultIdentifier,
                          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                          recurseIdentifier
                        ),
                        loopBody.body!
                      ),
                      factory.createReturnStatement(resultIdentifier)
                    ],
                    true
                  )
                )
              } catch (e) {
                console.log(e)
                return node
              }
            } else {
              return ts.visitEachChild(node, visitor, ctx)
            }
          } else {
            return ts.visitEachChild(node, visitor, ctx)
          }
        }
        const visited = ts.visitEachChild(sourceFile, visitor, ctx)
        return factory.updateSourceFile(sourceFile, [
          factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(false, undefined, factory.createNamespaceImport(recurse)),
            factory.createStringLiteral('@principia/compile/recurse')
          ),
          ...visited.statements
        ])
      }
    }
  }
}
