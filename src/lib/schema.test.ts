import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  validatePdfInsight,
} from './schema'

const validInsight = {
  document: {
    fileName: 'umowa.pdf',
    pages: 4,
    language: 'pl',
    type: 'umowa' as const,
    title: 'Umowa serwisowa',
    date: '2026-09-01',
  },

  summary:
    'Umowa określa zasady świadczenia usług serwisowych.',

  keyPoints: [
    'Okres umowy wynosi 12 miesięcy.',
    'Wynagrodzenie określono w PLN.',
    'Dokument zawiera warunki płatności.',
  ],

  entities: {
    organizations: [
      'Przykład sp. z o.o.',
    ],
    people: [],
  },

  amounts: [
    {
      value: 12500,
      currency: 'PLN',
      context: 'wynagrodzenie',
    },
  ],

  dates: [
    {
      date: '2026-10-01',
      context: 'termin płatności',
    },
  ],

  keywords: [
    'serwis',
    'umowa',
  ],
}

describe('pdfInsightSchema', () => {
  it('accepts a valid PDF Insight result', () => {
    const result =
      validatePdfInsight(validInsight)

    expect(result.document.fileName)
      .toBe('umowa.pdf')

    expect(result.document.type)
      .toBe('umowa')

    expect(result.amounts[0].currency)
      .toBe('PLN')
  })

  it('accepts null document date', () => {
    const result = validatePdfInsight({
      ...validInsight,

      document: {
        ...validInsight.document,
        date: null,
      },
    })

    expect(result.document.date).toBeNull()
  })

  it('accepts empty optional data arrays', () => {
    const result = validatePdfInsight({
      ...validInsight,

      entities: {
        organizations: [],
        people: [],
      },

      amounts: [],
      dates: [],
      keywords: [],
    })

    expect(result.entities.organizations)
      .toEqual([])

    expect(result.entities.people)
      .toEqual([])

    expect(result.amounts)
      .toEqual([])

    expect(result.dates)
      .toEqual([])
  })

  it('rejects an invalid document type', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        document: {
          ...validInsight.document,
          type: 'notatka',
        },
      }),
    ).toThrow()
  })

  it('rejects an invalid language code', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        document: {
          ...validInsight.document,
          language: 'pol',
        },
      }),
    ).toThrow()
  })

  it('rejects an invalid document date', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        document: {
          ...validInsight.document,
          date: '01.09.2026',
        },
      }),
    ).toThrow()
  })

  it('rejects an invalid date in dates array', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        dates: [
          {
            date: '01/10/2026',
            context: 'termin płatności',
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects a non-ISO currency code', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        amounts: [
          {
            value: 12500,
            currency: 'zł',
            context: 'wynagrodzenie',
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects fewer than three key points', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        keyPoints: [
          'Pierwsza informacja.',
          'Druga informacja.',
        ],
      }),
    ).toThrow()
  })

  it('rejects more than seven key points', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        keyPoints: [
          'Punkt 1',
          'Punkt 2',
          'Punkt 3',
          'Punkt 4',
          'Punkt 5',
          'Punkt 6',
          'Punkt 7',
          'Punkt 8',
        ],
      }),
    ).toThrow()
  })

  it('rejects zero pages', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,

        document: {
          ...validInsight.document,
          pages: 0,
        },
      }),
    ).toThrow()
  })

  it('rejects an empty summary', () => {
    expect(() =>
      validatePdfInsight({
        ...validInsight,
        summary: '',
      }),
    ).toThrow()
  })
})