import type { PdfExtractionResult } from './pdf'
import {
  validatePdfInsight,
  type PdfInsightResult,
} from './schema'

interface AiAnalyzeSuccessResponse {
  ok: true
  source: 'ai-v2'
  insight: unknown
}

interface AiAnalyzeErrorResponse {
  ok: false
  error: string
}

type AiAnalyzeResponse =
  | AiAnalyzeSuccessResponse
  | AiAnalyzeErrorResponse

function getApiUrl(): string {
  const baseUrl =
    import.meta.env.VITE_API_URL?.trim() ?? ''

  if (!baseUrl) {
    return '/api/analyze'
  }

  return `${baseUrl.replace(/\/+$/, '')}/api/analyze`
}

export async function analyzePdfWithAi(
  pdf: PdfExtractionResult,
): Promise<PdfInsightResult> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      fileName: pdf.fileName,
      pages: pdf.pages,
      text: pdf.text,
    }),
  })

  const raw = await response.text()

  if (!raw.trim()) {
    throw new Error(
      `Serwer AI zwrócił pustą odpowiedź (${response.status}).`,
    )
  }

  let data: AiAnalyzeResponse

  try {
    data = JSON.parse(raw) as AiAnalyzeResponse
  } catch {
    throw new Error(
      `Serwer AI zwrócił nieprawidłową odpowiedź (${response.status}).`,
    )
  }

  if (!response.ok || !data.ok) {
    const message =
      'error' in data
        ? data.error
        : 'AI analysis request failed.'

    throw new Error(message)
  }

  return validatePdfInsight(data.insight)
}
