import type { ASTNode, GraphQLError, GraphQLFormattedError, Source, SourceLocation } from 'graphql'

import { ApolloError } from 'apollo-server-koa'

export class GQLException extends ApolloError {
  readonly code: string | undefined
  readonly locations: ReadonlyArray<SourceLocation> | undefined
  readonly path: ReadonlyArray<string | number> | undefined
  readonly source: Source | undefined
  readonly positions: ReadonlyArray<number> | undefined
  readonly nodes: ReadonlyArray<ASTNode> | undefined
  readonly originalError: Error | undefined

  constructor(message: string, code?: string, extensions?: Record<string, any>) {
    super(message, code, extensions)
    this.code = code
  }
}

export function formatGraphQlException(
  graphQlError: GraphQLError & { originalError: GQLException }
): GraphQLFormattedError {
  return {
    message: graphQlError.originalError.message,
    locations: graphQlError.originalError.locations ?? graphQlError.locations,
    path: graphQlError.originalError.path ?? graphQlError.path,
    extensions: graphQlError.originalError.extensions ?? graphQlError.extensions
  }
}

export function fromGraphQLError(error: GraphQLError, code?: string) {
  const copy: GQLException = new GQLException(error.message, code, error.extensions)
}
