import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const HAN = /\p{Script=Han}/u
const STORY_BLOCKS_ROOT = path.resolve('src/pages/learn/blocks')

function productionJourneyWestFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return productionJourneyWestFiles(absolutePath)
    if (!/(?:journeywest|jtw)/iu.test(entry.name)) return []
    if (!/\.tsx?$/u.test(entry.name) || /\.(?:test|spec)\.tsx?$/u.test(entry.name)) return []
    return [absolutePath]
  })
}

function childFacingHan(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const findings: string[] = []

  function visit(node: ts.Node) {
    const text =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateLiteralToken(node) ||
      ts.isJsxText(node)
        ? node.text
        : ''
    if (HAN.test(text)) {
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1
      findings.push(`${path.relative(process.cwd(), file)}:${line}: ${text.replace(/\s+/gu, ' ').trim()}`)
    }
    ts.forEachChild(node, visit)
  }

  visit(ast)
  return findings
}

describe('Journey to the West English-only product gate', () => {
  it('contains no Han characters in production runtime text', () => {
    const findings = productionJourneyWestFiles(STORY_BLOCKS_ROOT).flatMap(childFacingHan)
    expect(findings, findings.join('\n')).toEqual([])
  })
})
