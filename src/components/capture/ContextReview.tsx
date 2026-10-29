// Resolve ambiguous or missing personal contexts locally, with an explicit option to link Me.
import type { Review } from '../../capture/resolver'
import { CONTEXT_KINDS, CONTEXT_LABELS } from '../../db/contexts'
import { Input } from '../ui/Input'
export function ContextReview({ review, change }: { review: Review; change: () => void }) {
  return (
    <section className="space-y-3" aria-label="Capture contexts">
      <h2 className="font-semibold">Contexts and memberships</h2>
      {review.contexts.map((row) => (
        <div className="rounded-2xl border p-4 space-y-3" key={row.value.ref}>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={row.include}
              onChange={(e) => {
                row.include = e.target.checked
                change()
              }}
            />
            Include context {row.value.name || CONTEXT_LABELS[row.value.kind]}
          </label>
          <fieldset disabled={!row.include} className="space-y-3 min-w-0">
            {row.guessed && (
              <p className="text-accent">
                Guessed: “my {row.value.kind}” is resolved from your Me profile. Check this choice.
              </p>
            )}
            {row.value.same_as_me && row.candidates.length !== 1 && (
              <p>
                {row.candidates.length
                  ? 'Several Me contexts match. Choose the intended one.'
                  : 'No Me context of this kind was found. Name it or choose an existing context, and optionally add it to Me.'}
              </p>
            )}
            <label className="block">
              Context kind
              <select
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={row.value.kind}
                onChange={(e) => {
                  row.value.kind = e.target.value as typeof row.value.kind
                  row.selected = ''
                  change()
                }}
              >
                {CONTEXT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {CONTEXT_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Context choice
              <select
                aria-label={`Context choice ${row.value.ref}`}
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={row.selected}
                onChange={(e) => {
                  row.selected = e.target.value
                  change()
                }}
              >
                <option value="">Choose a context</option>
                <option value="new">Create a new context</option>
                {review.local.contexts
                  .filter((c) => !c.deleted && c.kind === row.value.kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.id.slice(-8)}
                    </option>
                  ))}
              </select>
            </label>
            <Input
              name={`${row.value.ref}-context-name`}
              label="Context name"
              value={row.value.name ?? ''}
              onChange={(e) => {
                row.value.name = e.target.value
                change()
              }}
            />
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={row.addToMe}
                onChange={(e) => {
                  row.addToMe = e.target.checked
                  change()
                }}
              />
              Also add this context to my Me profile
            </label>
          </fieldset>
        </div>
      ))}
      {review.memberships.map((row, index) => (
        <fieldset key={index} className="rounded-xl border p-3 space-y-2">
          <legend>Membership {index + 1}</legend>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={row.include}
              onChange={(e) => {
                row.include = e.target.checked
                change()
              }}
            />
            Include {review.people.find((p) => p.value.ref === row.person)?.value.full_name ?? 'Me'}{' '}
            in {review.contexts.find((c) => c.value.ref === row.context)?.value.name ?? row.context}
          </label>
          <Input
            name={`membership-${index}-role`}
            label="Role"
            value={row.role}
            onChange={(e) => {
              row.role = e.target.value
              change()
            }}
          />
          <Input
            name={`membership-${index}-period`}
            label="Period"
            value={row.period ?? ''}
            onChange={(e) => {
              row.period = e.target.value
              change()
            }}
          />
        </fieldset>
      ))}
      <p>
        Skipping a person or context also skips their memberships and relationships. Unused contexts
        are not created.
      </p>
    </section>
  )
}
