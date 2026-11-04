import { z } from 'zod'

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi mieć format YYYY-MM-DD')

const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Waluta musi być kodem ISO 4217')

export const documentTypeSchema = z.enum([
  'faktura',
  'umowa',
  'oferta',
  'raport',
  'inne',
])

export const pdfInsightSchema = z.object({
  document: z.object({
    fileName: z.string().min(1),
    pages: z.number().int().positive(),
    language: z.string().regex(/^[a-z]{2}$/, 'Język musi być kodem ISO 639-1'),
    type: documentTypeSchema,
    title: z.string().min(1).nullable(),
    date: isoDateSchema.nullable(),
  }),
  summary: z.string().min(1),

  keyPoints: z.array(z.string().min(1)).min(3).max(7),

  entities: z.object({
    organizations: z.array(z.string().min(1)),
    people: z.array(z.string().min(1)),
  }),

  amounts: z.array(
    z.object({
      value: z.number(),
      currency: currencySchema,
      context: z.string().min(1),
    }),
  ),

  dates: z.array(
    z.object({
      date: isoDateSchema,
      context: z.string().min(1),
    }),
  ),

  keywords: z.array(z.string().min(1)),
})

export type PdfInsightResult = z.infer<typeof pdfInsightSchema>

export function validatePdfInsight(data: unknown): PdfInsightResult {
  return pdfInsightSchema.parse(data)
}
