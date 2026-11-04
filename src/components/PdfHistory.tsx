import { useEffect, useState } from 'react'

import {
  comparePdfHistoryEntries,
  type PdfComparisonResult,
} from '../lib/compare'
import {
  clearPdfHistory,
  deletePdfHistoryEntry,
  getPdfHistory,
  HISTORY_CHANGED_EVENT,
  type PdfHistoryEntry,
} from '../lib/history'

interface ComparisonListProps {
  title: string
  values: string[]
}

function ComparisonList({ title, values }: ComparisonListProps) {
  if (values.length === 0) {
    return null
  }

  return (
    <section className="pdf-comparison__list">
      <h4>{title}</h4>

      <ul>
        {values.map((value, index) => (
          <li key={`${title}-${value}-${index}`}>{value}</li>
        ))}
      </ul>
    </section>
  )
}

interface ComparisonResultProps {
  comparison: PdfComparisonResult
  onClose: () => void
}

function ComparisonResult({ comparison, onClose }: ComparisonResultProps) {
  const { documentA, documentB } = comparison

  return (
    <section className="pdf-comparison">
      <header className="pdf-comparison__header">
        <div>
          <h2>Porównanie dokumentów</h2>
          <p>
            Dokument A: <strong>{documentA.title ?? documentA.fileName}</strong>
          </p>
          <p>
            Dokument B: <strong>{documentB.title ?? documentB.fileName}</strong>
          </p>
        </div>

        <button type="button" onClick={onClose}>
          Zamknij porównanie
        </button>
      </header>

      <section className="pdf-comparison__overview">
        <h3>Podstawowe różnice</h3>

        <dl>
          <dt>Typ dokumentu A</dt>
          <dd>{documentA.type}</dd>

          <dt>Typ dokumentu B</dt>
          <dd>{documentB.type}</dd>

          <dt>Czy typ jest taki sam?</dt>
          <dd>{comparison.sameType ? 'Tak' : 'Nie'}</dd>

          <dt>Liczba stron A</dt>
          <dd>{documentA.pages}</dd>

          <dt>Liczba stron B</dt>
          <dd>{documentB.pages}</dd>

          <dt>Różnica liczby stron</dt>
          <dd>
            {comparison.pageDifference > 0
              ? `Dokument B ma o ${comparison.pageDifference} więcej`
              : comparison.pageDifference < 0
                ? `Dokument A ma o ${Math.abs(
                    comparison.pageDifference,
                  )} więcej`
                : 'Brak różnicy'}
          </dd>
        </dl>
      </section>

      <section className="pdf-comparison__summaries">
        <article>
          <h3>Podsumowanie A</h3>
          <p>{documentA.summary}</p>
        </article>

        <article>
          <h3>Podsumowanie B</h3>
          <p>{documentB.summary}</p>
        </article>
      </section>

      {comparison.amountComparisons.length > 0 && (
        <section className="pdf-comparison__amounts">
          <h3>Różnice kwotowe</h3>

          <p>
            Porównanie obejmuje sumę wszystkich kwot wykrytych w każdym
            dokumencie.
          </p>

          <ul>
            {comparison.amountComparisons.map((amount) => (
              <li key={amount.currency}>
                <strong>{amount.currency}</strong>
                {': '}A = {amount.totalA.toLocaleString('pl-PL')}
                {', '}B = {amount.totalB.toLocaleString('pl-PL')}
                {', '}
                różnica = {amount.difference > 0 ? '+' : ''}
                {amount.difference.toLocaleString('pl-PL')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pdf-comparison__differences">
        <h3>Najważniejsze informacje</h3>

        <ComparisonList title="Wspólne" values={comparison.commonKeyPoints} />

        <ComparisonList
          title="Tylko w dokumencie A"
          values={comparison.onlyInAKeyPoints}
        />

        <ComparisonList
          title="Tylko w dokumencie B"
          values={comparison.onlyInBKeyPoints}
        />
      </section>

      <section className="pdf-comparison__differences">
        <h3>Daty</h3>

        <ComparisonList title="Wspólne daty" values={comparison.commonDates} />

        <ComparisonList
          title="Daty tylko w dokumencie A"
          values={comparison.onlyInADates}
        />

        <ComparisonList
          title="Daty tylko w dokumencie B"
          values={comparison.onlyInBDates}
        />

        {comparison.commonDates.length === 0 &&
          comparison.onlyInADates.length === 0 &&
          comparison.onlyInBDates.length === 0 && (
            <p>Brak dat do porównania.</p>
          )}
      </section>

      <section className="pdf-comparison__differences">
        <h3>Organizacje</h3>

        <ComparisonList
          title="Wspólne organizacje"
          values={comparison.commonOrganizations}
        />

        <ComparisonList
          title="Organizacje tylko w dokumencie A"
          values={comparison.onlyInAOrganizations}
        />

        <ComparisonList
          title="Organizacje tylko w dokumencie B"
          values={comparison.onlyInBOrganizations}
        />

        {comparison.commonOrganizations.length === 0 &&
          comparison.onlyInAOrganizations.length === 0 &&
          comparison.onlyInBOrganizations.length === 0 && (
            <p>Brak organizacji do porównania.</p>
          )}
      </section>

      <section className="pdf-comparison__differences">
        <h3>Osoby</h3>

        <ComparisonList
          title="Wspólne osoby"
          values={comparison.commonPeople}
        />

        <ComparisonList
          title="Osoby tylko w dokumencie A"
          values={comparison.onlyInAPeople}
        />

        <ComparisonList
          title="Osoby tylko w dokumencie B"
          values={comparison.onlyInBPeople}
        />

        {comparison.commonPeople.length === 0 &&
          comparison.onlyInAPeople.length === 0 &&
          comparison.onlyInBPeople.length === 0 && (
            <p>Brak osób do porównania.</p>
          )}
      </section>
    </section>
  )
}

export function PdfHistory() {
  const [history, setHistory] = useState<PdfHistoryEntry[]>(() =>
    getPdfHistory(),
  )

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [comparison, setComparison] = useState<PdfComparisonResult | null>(null)

  useEffect(() => {
    const refreshHistory = () => {
      const nextHistory = getPdfHistory()

      setHistory(nextHistory)

      setSelectedIds((current) =>
        current.filter((id) => nextHistory.some((entry) => entry.id === id)),
      )
    }

    window.addEventListener(HISTORY_CHANGED_EVENT, refreshHistory)

    window.addEventListener('storage', refreshHistory)

    return () => {
      window.removeEventListener(HISTORY_CHANGED_EVENT, refreshHistory)

      window.removeEventListener('storage', refreshHistory)
    }
  }, [])

  const handleToggleSelection = (id: string) => {
    setComparison(null)

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((selectedId) => selectedId !== id)
      }

      if (current.length >= 2) {
        return current
      }

      return [...current, id]
    })
  }

  const handleCompare = () => {
    if (selectedIds.length !== 2) {
      return
    }

    const documentA = history.find((entry) => entry.id === selectedIds[0])

    const documentB = history.find((entry) => entry.id === selectedIds[1])

    if (!documentA || !documentB) {
      return
    }

    setComparison(comparePdfHistoryEntries(documentA, documentB))
  }

  const handleCancelComparison = () => {
    setSelectedIds([])
    setComparison(null)
  }

  const handleDelete = (id: string) => {
    deletePdfHistoryEntry(id)

    setSelectedIds((current) =>
      current.filter((selectedId) => selectedId !== id),
    )

    setComparison(null)
  }

  const handleClear = () => {
    clearPdfHistory()
    setSelectedIds([])
    setComparison(null)
  }

  if (history.length === 0) {
    return (
      <section className="pdf-history">
        <h2>Historia analiz</h2>
        <p>Brak zapisanych analiz AI.</p>
      </section>
    )
  }

  return (
    <section className="pdf-history">
      <header className="pdf-history__header">
        <div>
          <h2>Historia analiz</h2>
          <p>Zapisane analizy AI v2: {history.length}</p>
          <p>Wybrano do porównania: {selectedIds.length}/2</p>
        </div>

        <div className="pdf-history__actions">
          <button
            type="button"
            onClick={handleCompare}
            disabled={selectedIds.length !== 2}
          >
            Porównaj dokumenty
          </button>

          <button
            type="button"
            onClick={handleCancelComparison}
            disabled={selectedIds.length === 0 && comparison === null}
          >
            Anuluj porównanie
          </button>

          <button type="button" onClick={handleClear}>
            Wyczyść historię
          </button>
        </div>
      </header>

      {selectedIds.length === 2 && !comparison && (
        <p role="status">
          Wybrano dwa dokumenty. Kliknij „Porównaj dokumenty”.
        </p>
      )}

      {comparison && (
        <ComparisonResult
          comparison={comparison}
          onClose={handleCancelComparison}
        />
      )}

      <div className="pdf-history__list">
        {history.map((entry, index) => {
          const isSelected = selectedIds.includes(entry.id)

          const selectionLabel =
            selectedIds.indexOf(entry.id) === 0
              ? 'Dokument A'
              : selectedIds.indexOf(entry.id) === 1
                ? 'Dokument B'
                : null

          return (
            <article
              key={entry.id}
              className={`pdf-history__entry ${
                isSelected ? 'pdf-history__entry--selected' : ''
              }`}
            >
              <header>
                <h3>{entry.title ?? entry.fileName}</h3>

                <span className="analysis-badge analysis-badge--ai">AI v2</span>
              </header>

              {selectionLabel && (
                <p className="pdf-history__selection-label">{selectionLabel}</p>
              )}

              <label>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isSelected && selectedIds.length >= 2}
                  onChange={() => handleToggleSelection(entry.id)}
                />{' '}
                Wybierz do porównania
              </label>

              <dl>
                <dt>Numer w historii</dt>
                <dd>{index + 1}</dd>

                <dt>Plik</dt>
                <dd>{entry.fileName}</dd>

                <dt>Typ</dt>
                <dd>{entry.type}</dd>

                <dt>Liczba stron</dt>
                <dd>{entry.pages}</dd>

                <dt>Data analizy</dt>
                <dd>{new Date(entry.analyzedAt).toLocaleString('pl-PL')}</dd>
              </dl>

              <div className="pdf-history__summary">
                <h4>Podsumowanie</h4>
                <p>{entry.summary}</p>
              </div>

              {entry.amounts.length > 0 && (
                <div className="pdf-history__amounts">
                  <h4>Kwoty</h4>

                  <ul>
                    {entry.amounts.map((amount, amountIndex) => (
                      <li
                        key={`${entry.id}-${amount.currency}-${amount.value}-${amountIndex}`}
                      >
                        <strong>
                          {amount.value} {amount.currency}
                        </strong>

                        {' — '}

                        {amount.context}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button type="button" onClick={() => handleDelete(entry.id)}>
                Usuń z historii
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
