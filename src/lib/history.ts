import type { PdfInsightResult } from './schema'

const HISTORY_STORAGE_KEY = 'pdf-insight-history-v1'
export const HISTORY_CHANGED_EVENT = 'pdf-insight-history-changed'

const HISTORY_LIMIT = 50

export interface PdfHistoryEntry {
  id: string
  analyzedAt: string
  source: 'ai-v2'
  fileName: string
  pages: number
  type: PdfInsightResult['document']['type']
  title: string | null
  summary: string
  amounts: PdfInsightResult['amounts']
  insight: PdfInsightResult
}

function createHistoryId(fileName: string, analyzedAt: string): string {
  return `${analyzedAt}-${fileName}`
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function notifyHistoryChanged(): void {
  if (!isBrowser()) {
    return
  }

  window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT))
}

export function getPdfHistory(): PdfHistoryEntry[] {
  if (!isBrowser()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (entry): entry is PdfHistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'fileName' in entry &&
        'analyzedAt' in entry,
    )
  } catch {
    return []
  }
}

export function savePdfHistory(insight: PdfInsightResult): PdfHistoryEntry {
  const analyzedAt = new Date().toISOString()

  const entry: PdfHistoryEntry = {
    id: createHistoryId(insight.document.fileName, analyzedAt),
    analyzedAt,
    source: 'ai-v2',
    fileName: insight.document.fileName,
    pages: insight.document.pages,
    type: insight.document.type,
    title: insight.document.title,
    summary: insight.summary,
    amounts: insight.amounts,
    insight,
  }

  if (!isBrowser()) {
    return entry
  }

  const current = getPdfHistory()

  const duplicateIndex = current.findIndex(
    (item) =>
      item.fileName === entry.fileName &&
      item.summary === entry.summary &&
      JSON.stringify(item.amounts) === JSON.stringify(entry.amounts),
  )

  const next =
    duplicateIndex >= 0
      ? [entry, ...current.filter((_, index) => index !== duplicateIndex)]
      : [entry, ...current]

  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(next.slice(0, HISTORY_LIMIT)),
    )

    notifyHistoryChanged()
  } catch {
    // History must never break PDF analysis.
  }

  return entry
}

export function deletePdfHistoryEntry(id: string): void {
  if (!isBrowser()) {
    return
  }

  const next = getPdfHistory().filter((entry) => entry.id !== id)

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))

    notifyHistoryChanged()
  } catch {
    // Ignore storage errors.
  }
}

export function clearPdfHistory(): void {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY)

    notifyHistoryChanged()
  } catch {
    // Ignore storage errors.
  }
}
