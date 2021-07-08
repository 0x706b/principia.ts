import type { UnionToIntersection } from '@principia/base/util/types'

export interface AURItoInputAlgebra {}

export type InputAURIS = keyof AURItoInputAlgebra

export interface AURItoFieldAlgebra<Root, Ctx> {}

export type FieldAURIS = keyof AURItoFieldAlgebra<any, any>

export type FieldAlgebra<AURI extends FieldAURIS, Root, Ctx> = UnionToIntersection<AURItoFieldAlgebra<Root, Ctx>[AURI]>

export type InputAlgebra<AURI extends InputAURIS> = UnionToIntersection<AURItoInputAlgebra[AURI]>

export type FieldPURIS = keyof PURItoFieldAlgebras

export type InputPURIS = keyof PURItoInputAlgebras

export interface InputProgramAlgebra {}

export interface FieldProgramAlgebra {}

export interface PURItoInputAlgebras {}

export interface PURItoFieldAlgebras {}

export type InferredInputAlgebra<PURI extends InputPURIS> = InputAlgebra<PURItoInputAlgebras[PURI]>

export type InferredFieldAlgebra<PURI extends FieldPURIS, Root, Ctx> = FieldAlgebra<PURItoFieldAlgebras[PURI], Root, Ctx>
