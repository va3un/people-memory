// The developer section of Settings. These tools work on test data only.
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { showToast } from '../ui/Toast'
import { COUNT_LABELS, countRecords, loadSampleData, softDeleteEverything } from '../../db/operations'
import type { RecordCounts } from '../../db/operations'

// The word a developer must type to wipe records, so a stray tap cannot do it.
const CONFIRM_WORD = 'DELETE'

export function DeveloperTools() {
  const [counts, setCounts] = useState<RecordCounts | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const refresh = useCallback(async () => {
    setCounts(await countRecords())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const loadSample = async () => {
    setBusy(true)
    try {
      await loadSampleData()
      await refresh()
      showToast({ message: 'Sample data loaded', description: 'Eight fictional people are now in the app.' })
    } finally {
      setBusy(false)
    }
  }

  const deleteAll = async () => {
    setBusy(true)
    try {
      await softDeleteEverything()
      await refresh()
      setConfirmOpen(false)
      setConfirmText('')
      showToast({ message: 'All records deleted', description: 'Nothing was really erased, so Undo is possible later.' })
    } finally {
      setBusy(false)
    }
  }

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD

  return (
    <section className="mt-6">
      <p className="section-label">Developer tools</p>

      <Card className="mt-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Test data only</p>
            <p className="mt-0.5 text-sm text-muted">
              These tools are for trying the app with made-up people.
            </p>
          </div>
          <span className="shrink-0 rounded-chip bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            Test data only
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {COUNT_LABELS.map((item) => (
            <div key={item.key} className="flex items-center justify-between border-b border-border py-1">
              <dt className="text-sm text-muted">{item.label}</dt>
              <dd className="text-sm font-medium">{counts ? counts[item.key] : '-'}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="secondary" onClick={loadSample} disabled={busy}>
            Load sample data
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={busy}>
            Delete all data
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setConfirmText('')
        }}
        title="Delete all data?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false)
                setConfirmText('')
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteAll} disabled={!canDelete || busy}>
              Delete everything
            </Button>
          </>
        }
      >
        <p>
          This removes every person, context and relationship from this app. Records are marked as deleted,
          so nothing is really erased yet.
        </p>
        <p className="mt-3">Type {CONFIRM_WORD} to confirm.</p>
        <input
          aria-label="Confirmation word"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={CONFIRM_WORD}
          className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-4 text-base"
        />
      </Dialog>
    </section>
  )
}
