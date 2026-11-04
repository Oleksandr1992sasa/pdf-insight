import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

import { analyzePdfWithAi } from '../lib/ai-analyze'
import { analyzePdf } from '../lib/analyze'
import { savePdfHistory } from '../lib/history'
import { extractPdfText, type PdfExtractionResult } from '../lib/pdf'
import type { PdfInsightResult } from '../lib/schema'
import { JsonResult } from './JsonResult'
import { PdfHistory } from './PdfHistory'

const MAX_PDF_SIZE = 10 * 1024 * 1024

function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    return 'Wybierz plik PDF.'
  }

  if (file.size > MAX_PDF_SIZE) {
    return 'Plik PDF nie może być większy niż 10 MB.'
  }

  return null
}

type AnalysisSource = 'ai-v2' | 'local-v1.2'

type AnalysisStatus =
  | 'idle'
  | 'reading'
  | 'local-ready'
  | 'ai-analyzing'
  | 'ai-ready'
  | 'fallback'
  | 'error'

export function PdfUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const lastFileRef = useRef<File | null>(null)

  const [result, setResult] = useState<PdfExtractionResult | null>(null)

  const [insight, setInsight] = useState<PdfInsightResult | null>(null)

  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(
    null,
  )

  const [aiWarning, setAiWarning] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')

  const [isDragging, setIsDragging] = useState(false)

  const processFile = useCallback(async (file: File) => {
    lastFileRef.current = file

    setError(null)
    setAiWarning(null)
    setResult(null)
    setInsight(null)
    setAnalysisSource(null)
    setIsLoading(true)
    setAnalysisStatus('reading')

    try {
      const extracted = await extractPdfText(file)

      setResult(extracted)

      const localInsight = analyzePdf(extracted)

      setInsight(localInsight)
      setAnalysisSource('local-v1.2')
      setAnalysisStatus('local-ready')

      try {
        setAnalysisStatus('ai-analyzing')

        const aiInsight = await analyzePdfWithAi(extracted)

        setInsight(aiInsight)
        setAnalysisSource('ai-v2')
        setAiWarning(null)
        setAnalysisStatus('ai-ready')

        savePdfHistory(aiInsight)
      } catch (aiError: unknown) {
        const message =
          aiError instanceof Error
            ? aiError.message
            : 'Nieznany błąd analizy AI.'

        setAnalysisStatus('fallback')

        setAiWarning(
          `AI v2 niedostępne. Użyto lokalnego analizatora v1.2. ${message}`,
        )
      }
    } catch (caughtError: unknown) {
      setAnalysisStatus('error')

      if (caughtError instanceof Error) {
        setError(caughtError.message)
      } else {
        setError('Wystąpił nieznany błąd podczas analizy PDF.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleRetry = () => {
    const file = lastFileRef.current

    if (!file || isLoading) {
      return
    }

    void processFile(file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    const validationError = validatePdfFile(file)

    if (validationError) {
      lastFileRef.current = null
      setError(validationError)
      setAiWarning(null)
      setResult(null)
      setInsight(null)
      setAnalysisSource(null)
      setAnalysisStatus('error')
      return
    }

    void processFile(file)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]

    if (!file) {
      return
    }

    const validationError = validatePdfFile(file)

    if (validationError) {
      lastFileRef.current = null
      setError(validationError)
      setAiWarning(null)
      setResult(null)
      setInsight(null)
      setAnalysisSource(null)
      setAnalysisStatus('error')
      return
    }

    void processFile(file)
  }

  const openFilePicker = () => {
    inputRef.current?.click()
  }

  return (
    <section className="pdf-uploader">
      <div
        className={`pdf-drop-zone ${isDragging ? 'pdf-drop-zone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          hidden
        />

        <h2>Analiza dokumentu PDF</h2>

        <p>Przeciągnij plik PDF tutaj lub wybierz go z dysku.</p>

        <p>Maksymalny rozmiar pliku: 10 MB.</p>

        <p className="pdf-ai-notice">
          Treść dokumentu zostanie przesłana do usługi AI w celu wykonania
          analizy.
        </p>

        <button type="button" onClick={openFilePicker} disabled={isLoading}>
          {isLoading ? 'Analizowanie...' : 'Wybierz plik PDF'}
        </button>
      </div>

      {analysisStatus !== 'idle' && (
        <div
          className={`analysis-status analysis-status--${analysisStatus}`}
          role="status"
        >
          {analysisStatus === 'reading' && 'Odczytywanie dokumentu PDF...'}

          {analysisStatus === 'local-ready' && 'Analiza lokalna gotowa.'}

          {analysisStatus === 'ai-analyzing' && 'AI v2 analizuje dokument...'}

          {analysisStatus === 'ai-ready' && 'Analiza AI v2 gotowa.'}

          {analysisStatus === 'fallback' &&
            'Analiza lokalna gotowa. AI v2 jest niedostępne.'}

          {analysisStatus === 'error' && 'Analiza dokumentu nie powiodła się.'}
        </div>
      )}

      {error && (
        <div role="alert" className="pdf-error">
          <p>{error}</p>

          {analysisStatus === 'error' && (
            <button type="button" onClick={handleRetry} disabled={isLoading}>
              {isLoading ? 'Ponawianie...' : 'Ponów próbę'}
            </button>
          )}
        </div>
      )}

      {aiWarning && (
        <div role="status" className="pdf-warning">
          {aiWarning}
        </div>
      )}

      {result && insight && (
        <article className="pdf-result">
          <header>
            <h2>{insight.document.title ?? insight.document.fileName}</h2>

            <p className="analysis-source">
              Źródło analizy:{' '}
              <span
                className={
                  analysisSource === 'ai-v2'
                    ? 'analysis-badge analysis-badge--ai'
                    : 'analysis-badge analysis-badge--local'
                }
              >
                {analysisSource === 'ai-v2' ? 'AI v2' : 'Local v1.2'}
              </span>
            </p>
          </header>

          <section>
            <h3>Dokument</h3>

            <dl>
              <dt>Nazwa pliku</dt>
              <dd>{insight.document.fileName}</dd>

              <dt>Liczba stron</dt>
              <dd>{insight.document.pages}</dd>

              <dt>Język</dt>
              <dd>{insight.document.language}</dd>

              <dt>Typ</dt>
              <dd>{insight.document.type}</dd>

              {insight.document.date && (
                <>
                  <dt>Data dokumentu</dt>
                  <dd>{insight.document.date}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3>Podsumowanie</h3>
            <p>{insight.summary}</p>
          </section>

          <section>
            <h3>Najważniejsze informacje</h3>

            <ul>
              {insight.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          {insight.entities.organizations.length > 0 && (
            <section>
              <h3>Organizacje</h3>

              <ul>
                {insight.entities.organizations.map((organization) => (
                  <li key={organization}>{organization}</li>
                ))}
              </ul>
            </section>
          )}

          {insight.entities.people.length > 0 && (
            <section>
              <h3>Osoby</h3>

              <ul>
                {insight.entities.people.map((person) => (
                  <li key={person}>{person}</li>
                ))}
              </ul>
            </section>
          )}

          {insight.amounts.length > 0 && (
            <section>
              <h3>Kwoty</h3>

              <ul>
                {insight.amounts.map((amount, index) => (
                  <li key={`${amount.currency}-${amount.value}-${index}`}>
                    <strong>
                      {amount.value} {amount.currency}
                    </strong>

                    {' — '}

                    {amount.context}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insight.dates.length > 0 && (
            <section>
              <h3>Daty</h3>

              <ul>
                {insight.dates.map((dateItem, index) => (
                  <li key={`${dateItem.date}-${index}`}>
                    <strong>{dateItem.date}</strong>

                    {' — '}

                    {dateItem.context}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insight.keywords.length > 0 && (
            <section>
              <h3>Słowa kluczowe</h3>

              <p>{insight.keywords.join(', ')}</p>
            </section>
          )}

          <JsonResult insight={insight} />
        </article>
      )}

      <PdfHistory />
    </section>
  )
}
