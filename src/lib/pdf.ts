import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface PdfPage {
  pageNumber: number
  text: string
}

export interface PdfExtractionResult {
  fileName: string
  pages: number
  text: string
  pageContents: PdfPage[]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function extractPdfText(
  file: File,
): Promise<PdfExtractionResult> {
  if (file.type !== 'application/pdf') {
    throw new Error('Dozwolone są tylko pliki PDF.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Plik PDF może mieć maksymalnie 10 MB.')
  }

  if (file.size === 0) {
    throw new Error('Plik PDF jest pusty.')
  }

  const data = new Uint8Array(await file.arrayBuffer())

  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const pageContents: PdfPage[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()

      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      pageContents.push({
        pageNumber,
        text,
      })
    }

    return {
      fileName: file.name,
      pages: pdf.numPages,
      text: pageContents
        .map((page) => page.text)
        .filter(Boolean)
        .join('\n\n'),
      pageContents,
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Nie udało się odczytać PDF: ${error.message}`, {
        cause: error,
      })
    }

        throw new Error('Nie udało się odczytać PDF.', {
      cause: error,
    })
  } finally {
    await loadingTask.destroy()
  }
}