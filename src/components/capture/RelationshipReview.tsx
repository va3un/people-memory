// Relationship sentences use domain labels and store only one directional row.
import type { Review } from '../../capture/resolver'
import { relationshipLabel, RELATIONSHIP_TYPES } from '../../domain/relationships'
export function RelationshipReview({ review, change }: { review: Review; change: () => void }) {
  const options = [
    { ref: 'ME', name: review.me.full_name, gender: review.me.gender },
    ...review.people
      .filter((p) => p.include)
      .map((p) => ({ ref: p.value.ref, name: p.value.full_name, gender: p.value.gender })),
  ]
  return (
    <section className="space-y-3" aria-label="Capture relationships">
      <h2 className="font-semibold">Relationships</h2>
      {review.relationships.map((row, index) => {
        const a = options.find((p) => p.ref === row.a),
          b = options.find((p) => p.ref === row.b)
        return (
          <fieldset key={index} className="min-w-0 rounded-2xl border p-4 space-y-2">
            <legend>Relationship {index + 1}</legend>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={row.include}
                onChange={(e) => {
                  row.include = e.target.checked
                  change()
                }}
              />
              Include relationship
            </label>
            <p>
              {a && b
                ? `${a.name} is the ${relationshipLabel(row.type, a.gender).toLowerCase()} of ${b.name}.`
                : 'Skipped because an endpoint is excluded.'}
            </p>
            <label className="block">
              First person
              <select
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={row.a}
                onChange={(e) => {
                  row.a = e.target.value
                  change()
                }}
              >
                {options.map((p) => (
                  <option value={p.ref} key={p.ref}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Relationship type
              <select
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={row.type}
                onChange={(e) => {
                  row.type = e.target.value as typeof row.type
                  change()
                }}
              >
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {relationshipLabel(type, a?.gender ?? 'unknown')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Second person
              <select
                className="min-h-12 w-full rounded-xl border bg-surface p-2"
                value={row.b}
                onChange={(e) => {
                  row.b = e.target.value
                  change()
                }}
              >
                {options.map((p) => (
                  <option value={p.ref} key={p.ref}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        )
      })}
    </section>
  )
}
