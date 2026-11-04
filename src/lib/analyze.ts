import {
  validatePdfInsight,
  type PdfInsightResult,
} from './schema'
import type { PdfExtractionResult } from './pdf'

type AmountKind = 'rate' | 'item' | 'total'

interface DetectedAmount {
  value: number
  currency: string
  context: string
  kind: AmountKind
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function parseMoney(value: string): number {
  return Number.parseFloat(
    value.replace(/\s/g, '').replace(',', '.'),
  )
}

function normalizeCurrency(value: string): string {
  return value.toLowerCase() === 'zł'
    ? 'PLN'
    : value.toUpperCase()
}

function detectLanguage(text: string): string {
  const uk = (text.match(/[іїєґ]/gi) ?? []).length
  const pl = (text.match(/[ąćęłńóśźż]/gi) ?? []).length

  return uk > pl ? 'uk' : 'pl'
}

function detectDocumentType(
  text: string,
): 'faktura' | 'umowa' | 'oferta' | 'raport' | 'inne' {
  const lower = text.toLowerCase()

  if (
    lower.includes('faktura') ||
    lower.includes('invoice')
  ) {
    return 'faktura'
  }

  if (
    lower.includes('umowa') ||
    lower.includes('contract')
  ) {
    return 'umowa'
  }

  if (
    lower.includes('oferta') ||
    lower.includes('quotation')
  ) {
    return 'oferta'
  }

  if (
    lower.includes('raport') ||
    lower.includes('zestawienie wykonanych prac')
  ) {
    return 'raport'
  }

  return 'inne'
}

function extractTitle(
  text: string,
  fileName: string,
): string {
  const normalized = normalizeText(text)

  const titles = [
    'Zestawienie wykonanych prac',
    'Faktura',
    'Umowa',
    'Oferta',
    'Raport',
  ]

  const detected = titles.find((title) =>
    normalized
      .toLowerCase()
      .includes(title.toLowerCase()),
  )

  return detected ?? fileName
}

function addAmount(
  amounts: DetectedAmount[],
  amount: DetectedAmount,
): void {
  const exists = amounts.some(
    (item) =>
      item.value === amount.value &&
      item.currency === amount.currency &&
      item.kind === amount.kind,
  )

  if (!exists) {
    amounts.push(amount)
  }
}

function extractAmounts(
  text: string,
): DetectedAmount[] {
  const amounts: DetectedAmount[] = []
  const normalized = normalizeText(text)

  const calculationRegex =
    /(\d+(?:[.,]\d+)?)\s*(?:szt\.?|godz\.?|h)?\s*[×x]\s*(\d[\d\s.,]*?)\s*(zł|PLN|EUR|USD)\s*(\d[\d\s.,]*?)\s*(zł|PLN|EUR|USD)(?=\s|$|[.,;:)])/gi

  for (
    const match of normalized.matchAll(calculationRegex)
  ) {
    const quantity = Number.parseFloat(
      match[1].replace(',', '.'),
    )

    const rate = parseMoney(match[2])
    const rateCurrency = normalizeCurrency(match[3])

    const amount = parseMoney(match[4])
    const amountCurrency = normalizeCurrency(match[5])

    if (
      Number.isFinite(quantity) &&
      Number.isFinite(rate) &&
      Number.isFinite(amount)
    ) {
      addAmount(amounts, {
        value: rate,
        currency: rateCurrency,
        kind: 'rate',
        context:
          `Stawka: ${rate.toLocaleString('pl-PL')} ` +
          `${rateCurrency}`,
      })

      addAmount(amounts, {
        value: amount,
        currency: amountCurrency,
        kind: 'item',
        context:
          `Kwota pozycji: ${quantity.toLocaleString('pl-PL')} × ` +
          `${rate.toLocaleString('pl-PL')} ${rateCurrency} = ` +
          `${amount.toLocaleString('pl-PL')} ${amountCurrency}`,
      })
    }
  }

  const totalRegex =
    /(?:razem do zapłaty|razem|разом до сплати)\s*:?\s*(\d[\d\s.,]*?)\s*(zł|PLN|EUR|USD)(?=\s|$|[.,;:)])/gi

  for (
    const match of normalized.matchAll(totalRegex)
  ) {
    const value = parseMoney(match[1])

    if (Number.isFinite(value)) {
      const currency = normalizeCurrency(match[2])

      addAmount(amounts, {
        value,
        currency,
        kind: 'total',
        context:
          `Razem do zapłaty: ` +
          `${value.toLocaleString('pl-PL')} ${currency}`,
      })
    }
  }

  const moneyRegex =
    /(\d[\d\s.,]*?)\s*(zł|PLN|EUR|USD)(?=\s|$|[.,;:)])/gi

  for (
    const match of normalized.matchAll(moneyRegex)
  ) {
    const value = parseMoney(match[1])

    if (!Number.isFinite(value)) {
      continue
    }

    const currency = normalizeCurrency(match[2])

    const alreadyKnown = amounts.some(
      (item) =>
        item.value === value &&
        item.currency === currency,
    )

    if (alreadyKnown) {
      continue
    }

    addAmount(amounts, {
      value,
      currency,
      kind: 'item',
      context:
        `Kwota pozycji: ` +
        `${value.toLocaleString('pl-PL')} ${currency}`,
    })
  }

  return amounts
}

function extractKeyPoints(text: string): string[] {
  const normalized = normalizeText(text)

  const polishPart =
    normalized.split(
      /перелік виконаних робіт|перелік виконаних робіт/i,
    )[0] ?? normalized

  const points = Array.from(
    polishPart.matchAll(
      /(?:^|\s)(\d+)\s+(.+?)(?=\s+\d+\s+[A-ZĄĆĘŁŃÓŚŹŻ]|Razem do zapłaty|$)/g,
    ),
  )
    .map((match) =>
      normalizeText(
        `${match[1]}. ${match[2]}`,
      ),
    )
    .filter((value) => value.length >= 10)
    .slice(0, 7)

  if (points.length >= 3) {
    return points
  }

  const fallback = polishPart
    .split(/[.!?]+/)
    .map((value) => normalizeText(value))
    .filter((value) => value.length >= 15)
    .slice(0, 7)

  while (fallback.length < 3) {
    fallback.push(
      'Brak dodatkowych informacji w dokumencie.',
    )
  }

  return fallback
}

function buildSummary(
  title: string,
  keyPoints: string[],
  amounts: DetectedAmount[],
): string {
  const total = amounts.find(
    (amount) => amount.kind === 'total',
  )

  const workCount = keyPoints.filter(
    (point) =>
      !point.startsWith(
        'Brak dodatkowych informacji',
      ),
  ).length

  const parts = [
    `Dokument "${title}" zawiera informacje o wykonanych pracach.`,
  ]

  if (workCount > 0) {
    parts.push(
      `Rozpoznano ${workCount} główne pozycje lub informacje.`,
    )
  }

  if (total) {
    parts.push(
      `Łączna kwota do zapłaty wynosi ${total.value.toLocaleString(
        'pl-PL',
      )} ${total.currency}.`,
    )
  }

  return parts.join(' ')
}

function extractKeywords(text: string): string[] {
  const ignored = new Set([
    'wersja',
    'klienta',
    'język',
    'polski',
    'wartość',
    'ilość',
    'stawka',
    'версія',
  ])

  const words = normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 5 &&
        !ignored.has(word),
    )

  return Array.from(new Set(words)).slice(0, 10)
}

export function analyzePdf(
  pdf: PdfExtractionResult,
): PdfInsightResult {
  const text = pdf.text.trim()

  const title = extractTitle(
    text,
    pdf.fileName,
  )

  const amounts = extractAmounts(text)
  const keyPoints = extractKeyPoints(text)

  const result = {
    document: {
      fileName: pdf.fileName,
      pages: pdf.pages,
      language: detectLanguage(text),
      type: detectDocumentType(text),
      title,
      date: null,
    },

    summary: buildSummary(
      title,
      keyPoints,
      amounts,
    ),

    keyPoints,

    entities: {
      organizations: [],
      people: [],
    },

    amounts: amounts.map((amount) => ({
      value: amount.value,
      currency: amount.currency,
      context: amount.context,
    })),

    dates: [],

    keywords: extractKeywords(text),
  }

  return validatePdfInsight(result)
}