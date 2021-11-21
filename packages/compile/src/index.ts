import type ts from 'typescript'

import classFields from './classFields'
import dataFirst from './dataFirst'
import gen from './gen'
import identity from './identity'
import rewrite from './rewrite'
import specifierExtension from './specifierExtension'
import tag from './tag'
import trace from './trace'
import unflow from './unflow'
import unpipe from './unpipe'
import untrace from './untrace'

export default function bundle(
  program: ts.Program,
  opts?: {
    tracing?: boolean
    untrace?: boolean
    pipe?: boolean
    flow?: boolean
    identity?: boolean
    dataFirst?: boolean
    rewrite?: boolean
    moduleMap?: Record<string, [string, string, string]>
    functionModule?: string
    relativeProjectRoot?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    addExtensions?: boolean
    classFields?: boolean
    optimizeGen?: boolean
  }
) {
  const B0 = {
    rewrite: rewrite(program, opts),
    dataFirst: dataFirst(program),
    identity: identity(program, opts),
    tracer: trace(program, opts),
    unflow: unflow(program, opts),
    unpipe: unpipe(program, opts),
    untrace: untrace(program, opts),
    addSpecifierExtension: specifierExtension(program, opts),
    computedCtorFields: classFields(program, opts),
    tag: tag(program, opts),
    gen: gen(program, opts)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        rewrite: B0.rewrite.before(ctx),
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unflow: B0.unflow.before(ctx),
        unpipe: B0.unpipe.before(ctx),
        untrace: B0.untrace.before(ctx),
        computedCtorFields: B0.computedCtorFields.before(ctx),
        tag: B0.tag.before(ctx),
        gen: B0.gen.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const cf       = B1.computedCtorFields(sourceFile)
        const rewrite  = B1.rewrite(cf)
        const traced   = B1.tracer(rewrite)
        const unpiped  = B1.unpipe(traced)
        const unflowed = B1.unflow(unpiped)
        const untraced = B1.untrace(unflowed)
        const unid     = B1.identity(untraced)
        const df       = B1.dataFirst(unid)
        const tagged   = B1.tag(df)
        const gen      = B1.gen(tagged)

        return gen
      }
    },
    after(ctx: ts.TransformationContext) {
      const B1 = {
        addSpecifierExtension: B0.addSpecifierExtension(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        if (opts?.addExtensions === false) {
          return sourceFile
        } else {
          const final = B1.addSpecifierExtension(sourceFile)
          return final
        }
      }
    }
  }
}
