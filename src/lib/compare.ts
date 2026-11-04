import type { PdfHistoryEntry } from './history'

export interface AmountComparison {
  currency: string
  totalA: number
  totalB: number
  difference: number
}

export interface PdfComparisonResult {
  documentA: PdfHistoryEntry
  documentB: PdfHistoryEntry

  sameType: boolean
  pageDifference: number

  commonKeyPoints: string[]
  onlyInAKeyPoints: string[]
  onlyInBKeyPoints: string[]

  commonDates: string[]
  onlyInADates: string[]
  onlyInBDates: string[]

  commonOrganizations: string[]
  onlyInAOrganizations: string[]
  onlyInBOrganizations: string[]

  commonPeople: string[]
  onlyInAPeople: string[]
  onlyInBPeople: string[]

  amountComparisons: AmountComparison[]
}

function normalizeValue(value: string): string {
  return value
    .toLocaleLowerCase('pl-PL')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?()[\]{}]/g, '')
    .trim()
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>()

  return values.filter((value) => {
    const normalized = normalizeValue(value)

    if (!normalized || seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

function compareStringLists(
  listA: string[],
  listB: string[],
): {
  common: string[]
  onlyInA: string[]
  onlyInB: string[]
} {
  const uniqueA = uniqueValues(listA)
  const uniqueB = uniqueValues(listB)

  const normalizedA = new Map(
    uniqueA.map((value) => [normalizeValue(value), value]),
  )

  const normalizedB = new Map(
    uniqueB.map((value) => [normalizeValue(value), value]),
  )

  const common = uniqueA.filter((value) =>
    normalizedB.has(normalizeValue(value)),
  )

  const onlyInA = uniqueA.filter(
    (value) => !normalizedB.has(normalizeValue(value)),
  )

  const onlyInB = uniqueB.filter(
    (value) => !normalizedA.has(normalizeValue(value)),
  )

  return {
    common,
    onlyInA,
    onlyInB,
  }
}

function getAmountTotals(entry: PdfHistoryEntry): Map<string, number> {
  const totals = new Map<string, number>()

  for (const amount of entry.amounts) {
    const current = totals.get(amount.currency) ?? 0

    totals.set(amount.currency, current + amount.value)
  }

  return totals
}

function compareAmounts(
  documentA: PdfHistoryEntry,
  documentB: PdfHistoryEntry,
): AmountComparison[] {
  const totalsA = getAmountTotals(documentA)
  const totalsB = getAmountTotals(documentB)

  const currencies = new Set([...totalsA.keys(), ...totalsB.keys()])

  return Array.from(currencies)
    .sort()
    .map((currency) => {
      const totalA = totalsA.get(currency) ?? 0
      const totalB = totalsB.get(currency) ?? 0

      return {
        currency,
        totalA,
        totalB,
        difference: totalB - totalA,
      }
    })
}

export function comparePdfHistoryEntries(
  documentA: PdfHistoryEntry,
  documentB: PdfHistoryEntry,
): PdfComparisonResult {
  const keyPoints = compareStringLists(
    documentA.insight.keyPoints,
    documentB.insight.keyPoints,
  )

  const dates = compareStringLists(
    documentA.insight.dates.map((item) => `${item.date} — ${item.context}`),
    documentB.insight.dates.map((item) => `${item.date} — ${item.context}`),
  )

  const organizations = compareStringLists(
    documentA.insight.entities.organizations,
    documentB.insight.entities.organizations,
  )

  const people = compareStringLists(
    documentA.insight.entities.people,
    documentB.insight.entities.people,
  )

  return {
    documentA,
    documentB,

    sameType: documentA.type === documentB.type,

    pageDifference: documentB.pages - documentA.pages,

    commonKeyPoints: keyPoints.common,
    onlyInAKeyPoints: keyPoints.onlyInA,
    onlyInBKeyPoints: keyPoints.onlyInB,

    commonDates: dates.common,
    onlyInADates: dates.onlyInA,
    onlyInBDates: dates.onlyInB,

    commonOrganizations: organizations.common,
    onlyInAOrganizations: organizations.onlyInA,
    onlyInBOrganizations: organizations.onlyInB,

    commonPeople: people.common,
    onlyInAPeople: people.onlyInA,
    onlyInBPeople: people.onlyInB,

    amountComparisons: compareAmounts(documentA, documentB),
  }
}
