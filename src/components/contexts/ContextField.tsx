// A reusable quick-add selection opens the same bottom-sheet picker used by profiles.
import { useState } from 'react'
import { Button } from '../ui/Button'
import { ContextPicker } from './ContextPicker'
import { listContexts, type ContextChoice } from '../../db/contexts'
import { useLiveData } from '../../lib/useLiveData'

export function ContextField({
  choice,
  onChange,
}: {
  choice?: ContextChoice
  onChange: (choice?: ContextChoice) => void
}) {
  const [open, setOpen] = useState(false)
  const { data: contexts } = useLiveData(listContexts)
  const name = choice?.draft?.name ?? contexts?.find((c) => c.id === choice?.contextId)?.name
  return (
    <div className="space-y-2">
      <p className="font-medium">Known through</p>
      {choice && (
        <p>
          {name ?? 'Selected context'}
          {choice.role ? ` (${choice.role})` : ''}
          {choice.period ? `, ${choice.period}` : ''}
        </p>
      )}
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {choice ? 'Change context' : 'Choose a context'}
      </Button>
      {choice && (
        <Button variant="ghost" onClick={() => onChange(undefined)}>
          Remove selection
        </Button>
      )}
      {open && <ContextPicker onChoose={onChange} onClose={() => setOpen(false)} />}
    </div>
  )
}
