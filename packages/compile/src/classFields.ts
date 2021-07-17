import ts from 'typescript'

export default function classFields(
  _: ts.Program,
  opts?: {
    classFields?: boolean
  }
) {
  const classFields = !(opts?.classFields === false)

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isClassDeclaration(node)) {
            const members = node.members
            const updatedMembers: Array<ts.ClassElement>                = []
            const constructorAssignments: Array<ts.ExpressionStatement> = []
            let ctor: ts.ConstructorDeclaration | undefined             = undefined
            for (const member of members) {
              if (ts.isConstructorDeclaration(member)) {
                ctor = member
                continue
              }
              if (
                ts.isPropertyDeclaration(member) &&
                ts.isComputedPropertyName(member.name) &&
                member.initializer != null
              ) {
                updatedMembers.push(
                  factory.createPropertyDeclaration(
                    member.decorators,
                    [factory.createModifier(ts.SyntaxKind.DeclareKeyword), ...(member.modifiers ?? [])],
                    member.name,
                    member.questionToken || member.exclamationToken,
                    member.type,
                    undefined
                  )
                )
                constructorAssignments.push(
                  factory.createExpressionStatement(
                    factory.createAssignment(
                      factory.createElementAccessExpression(factory.createThis(), member.name.expression),
                      member.initializer
                    )
                  )
                )
              } else {
                updatedMembers.push(member)
              }
            }

            let updatedConstructor: ts.ConstructorDeclaration
            if (ctor) {
              if (constructorAssignments.length !== 0) {
                const hasSuperStatement = ctor.body?.statements.some(
                  (statement) =>
                    ts.isExpressionStatement(statement) &&
                    ts.isCallExpression(statement.expression) &&
                    statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
                )
                let updatedBodyStatements = []
                if (hasSuperStatement) {
                  let lastStatementWasSuper = false
                  for (const statement of ctor.body?.statements || []) {
                    if (lastStatementWasSuper) {
                      updatedBodyStatements.push(...constructorAssignments, statement)
                      lastStatementWasSuper = false
                      continue
                    }
                    if (
                      ts.isExpressionStatement(statement) &&
                      ts.isCallExpression(statement.expression) &&
                      statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
                    ) {
                      updatedBodyStatements.push(statement)
                      lastStatementWasSuper = true
                      continue
                    }
                    updatedBodyStatements.push(statement)
                  }
                  if (lastStatementWasSuper === true) {
                    updatedBodyStatements.push(...constructorAssignments)
                  }
                } else {
                  updatedBodyStatements = [...constructorAssignments, ...(ctor.body?.statements || [])]
                }

                updatedConstructor = factory.createConstructorDeclaration(
                  ctor.decorators,
                  ctor.modifiers,
                  ctor.parameters,
                  factory.createBlock(updatedBodyStatements, true)
                )
              } else {
                updatedConstructor = ctor
              }
            } else {
              if (
                node.heritageClauses &&
                node.heritageClauses.length > 0 &&
                node.heritageClauses.some((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
              ) {
                const argsName     = factory.createUniqueName('args')
                updatedConstructor = factory.createConstructorDeclaration(
                  undefined,
                  undefined,
                  [
                    factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      factory.createToken(ts.SyntaxKind.DotDotDotToken),
                      argsName,
                      undefined,
                      undefined,
                      undefined
                    )
                  ],
                  factory.createBlock(
                    [
                      factory.createExpressionStatement(
                        factory.createCallExpression(factory.createToken(ts.SyntaxKind.SuperKeyword), undefined, [
                          factory.createSpreadElement(argsName)
                        ])
                      ),
                      ...constructorAssignments
                    ],
                    true
                  )
                )
              } else {
                updatedConstructor = factory.createConstructorDeclaration(
                  undefined,
                  undefined,
                  [],
                  factory.createBlock(constructorAssignments, true)
                )
              }
            }

            return factory.createClassDeclaration(
              node.decorators,
              node.modifiers,
              node.name,
              node.typeParameters,
              node.heritageClauses,
              [...updatedMembers, updatedConstructor]
            )
          }
          return ts.visitEachChild(node, visitor, ctx)
        }
        return classFields ? ts.visitEachChild(sourceFile, visitor, ctx) : sourceFile
      }
    }
  }
}
