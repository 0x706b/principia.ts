/* eslint-disable functional/immutable-data */
import fs from 'fs'
import module from 'module'
import path from 'path'
import * as ts from 'typescript'

/*
 * TODO: I will clean this up
 */

export default function addSpecifierExtension(
  _: ts.Program,
  config?: {
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    createRequire?: boolean
  }
): ts.TransformerFactory<ts.SourceFile> {
  return (ctx) => (sourceFile) => {
    const { visitedSourceFile, info } = importExportVisitor(ctx, sourceFile, config)

    const generatedTopNodes = ts.factory.createNodeArray(info.imports)

    const generatedBottomNodes = ts.factory.createNodeArray(info.exports)

    const updatedStatements = ts.factory.createNodeArray([
      ...generatedTopNodes,
      ...visitedSourceFile.statements,
      ...generatedBottomNodes
    ])

    return ts.factory.updateSourceFile(visitedSourceFile, updatedStatements)
  }
}

export const importExportVisitor = (
  ctx: ts.TransformationContext,
  sourceFile: ts.SourceFile,
  config?: PluginConfig
): { info: VisitorInfo, visitedSourceFile: ts.SourceFile } => {
  const visitorInfo: VisitorInfo = { exports: [], imports: [] }

  const visitor = (info: VisitorInfo) => (node: ts.Node): ts.Node | undefined => {
    let newInfo: VisitorInfo = { exports: [], imports: [] }
    if (isImportOrExport(node)) {
      const specifierText = node.moduleSpecifier.text
      if (isSpecifierRelative(node)) {
        if (isImport(node)) {
          newInfo = {
            exports: [],
            imports: [
              ts.factory.createImportDeclaration(
                node.decorators,
                node.modifiers,
                node.importClause,
                createValidESMPath(node, sourceFile, config)
              )
            ]
          }
        } else if (isExport(node)) {
          newInfo = {
            imports: [],
            exports: [
              ts.factory.createExportDeclaration(
                node.decorators,
                node.modifiers,
                false,
                node.exportClause,
                createValidESMPath(node, sourceFile, config)
              )
            ]
          }
        }
      } else if (module.builtinModules.includes(specifierText)) {
        if (isImport(node)) {
          newInfo = {
            exports: [],
            imports: [node]
          }
        } else if (isExport(node)) {
          newInfo = {
            imports: [],
            exports: [node]
          }
        }
      } else {
        const packageJSON = getPackageJSON(node, config?.relativeProjectRoot)
        if (packageJSON) {
          if (isImport(node)) {
            newInfo = {
              exports: [],
              imports: [
                ts.factory.createImportDeclaration(
                  node.decorators,
                  node.modifiers,
                  node.importClause,
                  createValidESMPath(node, sourceFile, config, packageJSON)
                )
              ]
            }
          } else if (isExport(node)) {
            newInfo = {
              imports: [],
              exports: [
                ts.factory.createExportDeclaration(
                  node.decorators,
                  node.modifiers,
                  false,
                  node.exportClause,
                  createValidESMPath(node, sourceFile, config, packageJSON)
                )
              ]
            }
          }
        }
      }

      info.exports = info.exports.concat(newInfo.exports)
      info.imports = info.imports.concat(newInfo.imports)
      return undefined
    } else {
      return ts.visitEachChild(node, visitor(info), ctx)
    }
  }
  const visitedSourceFile = ts.visitEachChild(sourceFile, visitor(visitorInfo), ctx)
  return {
    info: visitorInfo,
    visitedSourceFile
  }
}

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

type PackageJson = Record<string, any>

function isDirectory(path: string): boolean {
  try {
    return fs.lstatSync(path).isDirectory()
  } catch {
    return false
  }
}

function deepHasProperty(obj: Record<string, any>, key: string): boolean {
  let hasKey = false
  for (const k in obj) {
    if (k === key) {
      hasKey = true
    } else if (typeof obj[k] == 'object' && !Array.isArray(obj[k])) {
      hasKey = deepHasProperty(obj[k] as Record<string, unknown>, key)
    }
    if (hasKey) {
      break
    }
  }
  return hasKey
}

function isImportOrExport(node: ts.Node): node is ImportOrExport {
  return (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    !!node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  )
}

function isImport(node: ts.Node): node is Import {
  return ts.isImportDeclaration(node) && !!node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
}

function isSpecifierRelative(node: ImportOrExport) {
  const specifierText = node.moduleSpecifier.text
  return specifierText.startsWith('./') || specifierText.startsWith('../') || specifierText.startsWith('..')
}

function isExport(node: ts.Node): node is Export {
  return ts.isExportDeclaration(node) && !!node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
}

function findPackageJSON(prospectivePath: string): Buffer | null {
  const folderPath = prospectivePath.split('/')
  if (folderPath.slice(-1)[0] === 'node_modules') {
    return null
  } else {
    const newPath = [...folderPath, 'package.json'].join('/')
    try {
      return fs.readFileSync(newPath)
    } catch {
      return findPackageJSON(folderPath.slice(0, -1).join('/'))
    }
  }
}

function getPackageJSON(node: ImportOrExport, relativeProjectRoot?: string) {
  const prospectivePath = path.resolve(relativeProjectRoot ?? process.cwd(), 'node_modules', node.moduleSpecifier.text)
  const maybeBuffer     = findPackageJSON(prospectivePath)
  if (maybeBuffer) {
    try {
      return JSON.parse(maybeBuffer.toString()) as PackageJson
    } catch {
      return null
    }
  } else {
    return null
  }
}

function isSpecifierExtensionEmpty(node: ImportOrExport) {
  return path.extname(node.moduleSpecifier.text) === ''
}

function getAbsolutePathForSpecifier(
  node: ImportOrExport,
  sourceFile: ts.SourceFile,
  config?: PluginConfig,
  packageJSON?: PackageJson
) {
  const specifierText = node.moduleSpecifier.text
  if (isSpecifierRelative(node)) {
    return path.resolve(path.parse(sourceFile.fileName).dir, specifierText === '..' ? '../' : specifierText)
  } else {
    if (packageJSON && packageJSON.name && specifierText.includes(packageJSON.name)) {
      const p = packageJSON

      const mainPath: string | null = p.exports?.import?.['./*'] ?? p.exports?.['./*']?.import ?? p.main ?? null
      let parts: string[]
      if (mainPath) {
        const s = mainPath.replace('./', '').split('/').slice(0, -1).join('/')
        parts   = [p.name, s, ...specifierText.replace(p.name, '').replace(`/${s}`, '').split('/')]
      } else {
        parts = [specifierText]
      }
      /*
       * const parts = F.pipe(
       *   O.fromNullable<string>(p.exports?.import?.['./*'] ?? p.exports?.['./*']?.import ?? p.main ?? null),
       *   O.map((s) => s.replace('./', '').split('/').slice(0, -1).join('/')),
       *   O.map((mainPath): string[] => [
       *     p.name,
       *     mainPath,
       *     ...specifierText.replace(p.name, '').replace(`/${mainPath}/`, '').split('/')
       *   ]),
       *   O.fold(() => [specifierText], F.identity)
       * )
       */
      return path.resolve(config?.relativeProjectRoot ?? process.cwd(), 'node_modules', ...parts)
    } else {
      return path.resolve(config?.relativeProjectRoot ?? process.cwd(), 'node_modules', specifierText)
    }
  }
}

function createValidESMPath(
  node: ImportOrExport,
  sourceFile: ts.SourceFile,
  config?: PluginConfig,
  packageJSON?: PackageJson
): ts.StringLiteral {
  if (config?.specifierExtension === false) {
    return node.moduleSpecifier
  }
  if (
    packageJSON &&
    node.moduleSpecifier.text === packageJSON.name &&
    (packageJSON.main || (packageJSON.exports && deepHasProperty(packageJSON.exports, '.')))
  ) {
    return node.moduleSpecifier
  }
  if (isSpecifierExtensionEmpty(node) || config?.ignoreExtensions?.includes(path.extname(node.moduleSpecifier.text))) {
    const absolutePath = getAbsolutePathForSpecifier(node, sourceFile, config, packageJSON)
    return ts.factory.createStringLiteral(
      isDirectory(absolutePath) ? `${node.moduleSpecifier.text}/index.js` : `${node.moduleSpecifier.text}.js`
    )
  }
  return node.moduleSpecifier
}

/*
 * -------------------------------------------
 * Types
 * -------------------------------------------
 */

type ImportOrExport = (ts.ImportDeclaration | ts.ExportDeclaration) & {
  moduleSpecifier: ts.StringLiteral
}

type Import = ts.ImportDeclaration & {
  importClause: ts.ImportClause
  moduleSpecifier: ts.StringLiteral
}

export type Export = ts.ExportDeclaration & {
  moduleSpecifier: ts.StringLiteral
}

export type PluginConfig = {
  specifierExtension?: boolean
  ignoreExtensions?: ReadonlyArray<string>
  relativeProjectRoot?: string
}

export type VisitorInfo = {
  exports: ts.ExportDeclaration[]
  imports: ts.ImportDeclaration[]
}
