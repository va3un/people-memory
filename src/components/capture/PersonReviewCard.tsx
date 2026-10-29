// Every extracted person is editable, with explicit identity and assumption choices before saving.
import type { Person } from '../../db/schema'
import { personCandidates } from '../../capture/resolver'
import type { PersonReview } from '../../capture/resolver'
import { proposedPerson } from '../../capture/save'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
export function PersonReviewCard({
  row,
  change,
  allPeople,
}: {
  row: PersonReview
  change: () => void
  allPeople: Person[]
}) {
  const p = row.value,
    existing = row.candidates.find((person) => person.id === row.selected)
  const update = (key: keyof typeof p, value: unknown) => {
    Object.assign(p, { [key]: value })
    if (['full_name', 'maiden_name', 'nicknames'].includes(key)) {
      const selected = row.candidates.find((person) => person.id === row.selected)
      row.candidates = personCandidates(p, allPeople)
      if (selected && !row.candidates.some((person) => person.id === selected.id))
        row.candidates.push(selected)
      if (row.selected === 'new' && row.candidates.length) row.selected = ''
      if (!row.candidates.length) row.selected = 'new'
    }
    change()
  }
  const preview = existing ? proposedPerson(row, existing) : undefined
  return (
    <article
      className="rounded-2xl border bg-surface p-4 space-y-3"
      aria-label={`Review ${p.full_name}`}
    >
      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          checked={row.include}
          onChange={(e) => {
            row.include = e.target.checked
            change()
          }}
        />
        Include {p.full_name}
      </label>
      <fieldset disabled={!row.include} className="min-w-0 space-y-3">
        {!!row.candidates.length && (
          <div className="rounded-xl bg-accent-soft p-3">
            <p>Possible matches. No identity is chosen automatically.</p>
            <label>
              Person identity
              <select
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                aria-label={`Identity for ${p.ref}`}
                value={row.selected}
                onChange={(e) => {
                  row.selected = e.target.value
                  change()
                }}
              >
                <option value="">Choose an identity</option>
                <option value="new">Create a new person</option>
                {row.candidates.map((person) => (
                  <option key={person.id} value={person.id}>
                    Use existing: {person.full_name}
                    {person.city ? ` (${person.city})` : ''}
                    {person.is_me ? ' (Me)' : ''} · {person.id.slice(-8)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!row.candidates.length && (
          <p>
            Creates a new person. Re-read the draft after editing a name to check for additional
            possible matches.
          </p>
        )}
        <Input
          name={`${p.ref}-name`}
          label="Full name"
          value={p.full_name}
          onChange={(e) => update('full_name', e.target.value)}
        />
        {(row.nameWarning || row.suggestionApplied) && (
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={row.approveName}
              onChange={(e) => {
                row.approveName = e.target.checked
                change()
              }}
            />
            Guessed name: I explicitly confirm this name after checking the passage.
          </label>
        )}
        {row.suggestion && (
          <div className="space-y-2">
            <p>
              Guessed surname suggestion: {row.suggestion.name}; possible maiden surname{' '}
              {row.suggestion.maiden}. Marriage does not establish either.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                if (row.suggestionApplied) {
                  p.full_name = row.originalName
                  p.maiden_name = row.originalMaiden
                  row.suggestionApplied = false
                  row.approveName = false
                  row.approveMaiden = false
                } else {
                  p.full_name = row.suggestion!.name
                  p.maiden_name = row.suggestion!.maiden
                  row.suggestionApplied = true
                  row.approveName = true
                  row.approveMaiden = true
                }
                change()
              }}
            >
              {row.suggestionApplied ? 'Revert surname suggestion' : 'Use surname suggestion'}
            </Button>
          </div>
        )}
        <Input
          name={`${p.ref}-maiden`}
          label="Possible maiden name"
          value={p.maiden_name ?? ''}
          onChange={(e) => {
            row.approveMaiden = false
            update('maiden_name', e.target.value || null)
          }}
        />
        {!!p.maiden_name && (
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={row.approveMaiden}
              onChange={(e) => {
                row.approveMaiden = e.target.checked
                change()
              }}
            />
            Include this maiden name only after explicit confirmation.
          </label>
        )}
        <label className="block">
          Gender{' '}
          {p.gender !== 'unknown' && p.gender_source !== 'stated' && (
            <span className="text-accent">(guessed)</span>
          )}
          <select
            className="min-h-12 w-full rounded-xl border bg-surface p-2"
            value={p.gender}
            onChange={(e) => update('gender', e.target.value)}
          >
            {['unknown', 'male', 'female', 'other'].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        {(['category', 'city', 'how_i_know'] as const).map((key) => (
          <Input
            key={key}
            name={`${p.ref}-${key}`}
            label={{ category: 'Category', city: 'City', how_i_know: 'How I know them' }[key]}
            value={p[key] ?? ''}
            onChange={(e) => update(key, e.target.value)}
          />
        ))}
        <Input
          name={`${p.ref}-nicknames`}
          label="Nicknames (comma separated)"
          value={p.nicknames.join(',')}
          onChange={(e) => update('nicknames', e.target.value.split(',').filter(Boolean))}
        />
        <label className="block">
          Phone numbers (one per line)
          <textarea
            className="min-h-24 w-full rounded-xl border bg-surface p-3"
            value={p.phones.join('\n')}
            onChange={(e) => update('phones', e.target.value.split('\n'))}
          />
        </label>
        <label className="block">
          Notes
          <textarea
            className="min-h-24 w-full rounded-xl border bg-surface p-3"
            value={p.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </label>
        {!!p.notes && (
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={row.appendNotes}
              onChange={(e) => {
                row.appendNotes = e.target.checked
                change()
              }}
            />
            {existing ? 'Append these notes' : 'Include these notes'}
          </label>
        )}
        {!!p.assumed.length && (
          <p className="break-words text-accent">Guessed: {p.assumed.join('; ')}</p>
        )}
        {existing && (
          <div className="rounded-xl border p-3">
            <p>
              Existing filled fields stay unchanged. Empty fields may be filled. Result after save:
            </p>
            <dl>
              {(
                [
                  'full_name',
                  'maiden_name',
                  'gender',
                  'category',
                  'city',
                  'how_i_know',
                  'nicknames',
                  'phones',
                  'notes',
                ] as const
              ).map((key) => (
                <div key={key} className="mt-2 break-words">
                  <dt className="font-semibold">{key.replaceAll('_', ' ')}</dt>
                  <dd className="whitespace-pre-wrap">
                    {Array.isArray(preview![key])
                      ? (preview![key] as string[]).join(', ')
                      : preview![key] || 'Empty'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </fieldset>
    </article>
  )
}
