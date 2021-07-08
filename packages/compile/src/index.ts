import type ts from 'typescript'

import computedCtorFields from './computedCtorFields'
import dataFirst from './dataFirst'
import addSpecifierExtension from './fixESM'
import identity from './identity'
import rewrite from './rewrite'
import tracer from './tracing'
import unflow from './unflow'
import unpipe from './unpipe'
import untrace from './untrace'

export default function bundle(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    untrace?: boolean
    pipe?: boolean
    flow?: boolean
    identity?: boolean
    dataFirst?: boolean
    rewrite?: boolean
    moduleMap?: Record<string, string>
    functionModule?: string
    relativeProjectRoot?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    addExtensions?: boolean
    computedCtorFields?: boolean
  }
) {
  const B0 = {
    rewrite: rewrite(_program, _opts),
    dataFirst: dataFirst(_program),
    identity: identity(_program, _opts),
    tracer: tracer(_program, _opts),
    unflow: unflow(_program, _opts),
    unpipe: unpipe(_program, _opts),
    untrace: untrace(_program, _opts),
    addSpecifierExtension: addSpecifierExtension(_program, _opts),
    computedCtorFields: computedCtorFields(_program, _opts)
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
        computedCtorFields: B0.computedCtorFields.before(ctx)
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

        return df
      }
    },
    after(ctx: ts.TransformationContext) {
      const B1 = {
        addSpecifierExtension: B0.addSpecifierExtension(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        if (_opts?.addExtensions === false) {
          return sourceFile
        } else {
          const final = B1.addSpecifierExtension(sourceFile)
          return final
        }
      }
    }
  }
}
