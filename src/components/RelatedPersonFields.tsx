// Quick add stores one directional link; the sentence makes the selected direction explicit.
import type { Person, RelationshipType } from '../db/schema'
import type { NewPerson } from '../db/typed'
import {
  RELATIONSHIP_TYPES,
  relationshipLabel,
  relationshipSentence,
} from '../domain/relationships'

export function RelatedPersonFields({
  people,
  values,
  relatedTo,
  relationshipType,
  onPerson,
  onType,
}: {
  people: Person[]
  values: NewPerson
  relatedTo: string
  relationshipType: RelationshipType
  onPerson: (id: string) => void
  onType: (type: RelationshipType) => void
}) {
  const relative = people.find((person) => person.id === relatedTo)
  return (
    <>
      <label htmlFor="related_to">Related to</label>
      <select
        id="related_to"
        aria-label="Related to"
        className="min-h-12 w-full rounded-2xl border bg-surface px-3 py-3"
        value={relatedTo}
        onChange={(event) => onPerson(event.target.value)}
      >
        <option value="">None</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.full_name}
          </option>
        ))}
      </select>
      {relative && (
        <>
          <label htmlFor="relationship_type">
            This new person is the following of {relative.full_name}
          </label>
          <select
            id="relationship_type"
            aria-label="Relationship type"
            className="min-h-12 rounded-2xl border bg-surface px-3 py-3"
            value={relationshipType}
            onChange={(event) => onType(event.target.value as RelationshipType)}
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {relationshipLabel(type, values.gender)}
              </option>
            ))}
          </select>
          <p>
            {relationshipSentence(
              values.full_name || 'New person',
              relationshipType,
              relative.full_name,
              values.gender,
            )}
          </p>
        </>
      )}
    </>
  )
}
