const EVIDENCE_TRACE_LIMIT = 12
const EVIDENCE_VALUE_LIMIT = 64

function boundedC6EvidenceValue(value: string): string {
  return value.slice(0, EVIDENCE_VALUE_LIMIT)
}

export function boundedC6EvidenceTrace(trace: readonly string[]): string[] {
  if (trace.length <= EVIDENCE_TRACE_LIMIT) return [...trace]
  const finalEntry = trace.at(-1)!
  const landmarks = trace.filter(
    (entry) => entry !== finalEntry && /(?:goto:|say:|planned:|actual:|end$)/.test(entry),
  )
  const candidates = [trace[0], ...landmarks].filter(
    (entry): entry is string => Boolean(entry),
  )
  const unique = [...new Set(candidates)]
  for (const entry of trace) {
    if (entry !== finalEntry && !unique.includes(entry)) unique.push(entry)
    if (unique.length === EVIDENCE_TRACE_LIMIT - 1) break
  }
  return [...unique.slice(0, EVIDENCE_TRACE_LIMIT - 1), finalEntry]
}

export function nonEmptyC6Selections(
  selections: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(selections)
      .filter(([, values]) => values.length > 0)
      .map(([key, values]) => [key, values.map(boundedC6EvidenceValue)]),
  )
}
