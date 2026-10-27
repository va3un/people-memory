// The developer section of Settings. These tools work on test data only.
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { showToast } from '../ui/Toast'
import { COUNT_LABELS, countRecords, loadSampleData, softDeleteSampleData } from '../../db/operations'
import type { RecordCounts } from '../../db/operations'

// The word a developer must type to delete the sample data, so a stray tap cannot do it.
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
      showToast({
        message: 'Sample data loaded',
        description: 'Missing or unchanged deleted sample records were loaded. Edited records were kept.',
      })
    } finally {
      setBusy(false)
    }
  }

  const deleteSample = async () => {
    setBusy(true)
    try {
      await softDeleteSampleData()
      await refresh()
      setConfirmOpen(false)
      setConfirmText('')
      showToast({
        message: 'Sample data deleted',
        description: 'Unchanged sample records were deleted. Edited records and samples used by new links or photos were kept.',
      })
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
              These tools manage unchanged fictional sample records. Edited records and samples used by new links or photos are kept.
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
            Delete sample data
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setConfirmText('')
        }}
        title="Delete sample data?"
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
            <Button variant="danger" onClick={deleteSample} disabled={!canDelete || busy}>
              Delete sample data
            </Button>
          </>
        }
      >
        <p>
          This removes the fictional sample people, contexts and relationships from this app. Records are
          marked as deleted, so nothing is really erased yet.
        </p>
        <p className="mt-3">Edited records and samples used by new links or photos are kept.</p>
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
