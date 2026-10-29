// Context choices stay drafts until the enclosing save succeeds; cancelling writes nothing.
import { useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useLiveData } from '../../lib/useLiveData'
import { CONTEXT_KINDS, CONTEXT_LABELS, listContexts, type ContextChoice } from '../../db/contexts'
import type { ContextKind } from '../../db/schema'

export function ContextPicker({
  onChoose,
  onClose,
}: {
  onChoose: (choice: ContextChoice) => void | Promise<void>
  onClose: () => void
}) {
  const { data: contexts, error: readError } = useLiveData(listContexts)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ContextKind>('organization')
  const [city, setCity] = useState('')
  const [role, setRole] = useState('')
  const [period, setPeriod] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const choose = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onChoose(
        mode === 'existing'
          ? { contextId: selected, role, period }
          : { draft: { name, kind, city: city || undefined }, role, period },
      )
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save this context. Your choices are still here.',
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Choose a context"
    >
      <form
        data-unsaved={!!(name || selected || role || period) || undefined}
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void choose()
        }}
      >
        {(error || readError) && (
          <p role="alert" className="mb-3 text-danger">
            {error || readError}
          </p>
        )}
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              aria-pressed={mode === 'existing'}
              onClick={() => setMode('existing')}
            >
              Use existing
            </Button>
            <Button
              variant="secondary"
              aria-pressed={mode === 'new'}
              onClick={() => setMode('new')}
            >
              Create context
            </Button>
          </div>
          {mode === 'existing' ? (
            <>
              {!contexts && !readError && <p role="status">Loading contexts…</p>}
              {contexts?.length === 0 && <p>No contexts yet. Choose Create context to add one.</p>}
              <div role="group" aria-label="Existing contexts" className="max-h-48 overflow-y-auto">
                {contexts?.map((context) => (
                  <label
                    key={context.id}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border p-3"
                  >
                    <input
                      type="radio"
                      name="context"
                      value={context.id}
                      checked={selected === context.id}
                      onChange={() => setSelected(context.id)}
                    />
                    <span className="break-words">
                      {context.name} ({CONTEXT_LABELS[context.kind]}
                      {context.city ? `, ${context.city}` : ''})
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <Input
                name="context_name"
                label="Context name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="context_kind">Kind</label>
              <select
                id="context_kind"
                className="min-h-12 rounded-2xl border bg-surface px-3 py-3"
                value={kind}
                onChange={(e) => setKind(e.target.value as ContextKind)}
              >
                {CONTEXT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {CONTEXT_LABELS[value]}
                  </option>
                ))}
              </select>
              <Input
                name="context_city"
                label="Context city (optional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </>
          )}
          <Input
            name="membership_role"
            label="Role (optional)"
            placeholder="Student, Parent, Resident, Colleague"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Input
            name="membership_period"
            label="Period (optional)"
            placeholder="1996 to 2002"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button type="submit" disabled={busy || (mode === 'new' ? !name.trim() : !selected)}>
            {busy ? 'Saving…' : 'Use this context'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </fieldset>
      </form>
    </Sheet>
  )
}
