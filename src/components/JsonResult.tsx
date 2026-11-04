import type { PdfInsightResult } from '../lib/schema'

interface JsonResultProps {
  insight: PdfInsightResult
}

export function JsonResult({ insight }: JsonResultProps) {
  const json = JSON.stringify(insight, null, 2)

  const handleDownload = () => {
    const blob = new Blob([json], {
      type: 'application/json;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    const baseName = insight.document.fileName
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')

    link.href = url
    link.download = `${baseName}-insight.json`

    document.body.append(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  return (
    <section className="json-result">
      <header className="json-result__header">
        <div>
          <h3>Dane JSON</h3>
          <p>Wynik zgodny ze schematem PDF Insight.</p>
        </div>

        <button type="button" onClick={handleDownload}>
          Pobierz JSON
        </button>
      </header>

      <details>
        <summary>Pokaż podgląd JSON</summary>

        <pre>
          <code>{json}</code>
        </pre>
      </details>
    </section>
  )
}
