// Optional profile fields share the same controls in Add and Edit.
import { Input } from './ui/Input'
import type { NewPerson } from '../db/typed'

export function PersonDetailsFields({
  values,
  change,
}: {
  values: NewPerson
  change: (changes: Partial<NewPerson>) => void
}) {
  const birthday = values.birthday
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Input
        name="display_name"
        label="Display name"
        value={values.display_name}
        onChange={(e) => change({ display_name: e.target.value })}
      />
      <Input
        name="maiden_name"
        label="Maiden name"
        value={values.maiden_name ?? ''}
        onChange={(e) => change({ maiden_name: e.target.value || undefined })}
      />
      <label htmlFor="gender">Gender</label>
      <select
        id="gender"
        name="gender"
        aria-label="Gender"
        className="mt-1 h-12 w-full rounded-2xl border bg-surface px-3"
        value={values.gender}
        onChange={(e) => change({ gender: e.target.value as NewPerson['gender'] })}
      >
        <option value="unknown">Unknown</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <Input
        name="category"
        label="Category"
        value={values.category ?? ''}
        onChange={(e) => change({ category: e.target.value || undefined })}
      />
      <Input
        name="phones"
        type="tel"
        label="Phone numbers (separate with commas)"
        value={values.phones.join(',')}
        onChange={(e) => change({ phones: e.target.value.split(',') })}
      />
      <Input
        name="email"
        type="email"
        label="Email"
        value={values.email ?? ''}
        onChange={(e) => change({ email: e.target.value || undefined })}
      />
      <Input
        name="city"
        label="City"
        value={values.city ?? ''}
        onChange={(e) => change({ city: e.target.value || undefined })}
      />
      <Input
        name="nicknames"
        label="Nicknames (separate with commas)"
        value={values.nicknames.join(',')}
        onChange={(e) => change({ nicknames: e.target.value.split(',') })}
      />
      <fieldset className="flex flex-wrap gap-2">
        <legend>Birthday (optional, year may be blank)</legend>
        {(['month', 'day', 'year'] as const).map((part) => (
          <Input
            key={part}
            name={`birthday_${part}`}
            label={part[0].toUpperCase() + part.slice(1)}
            type="number"
            min="1"
            max={part === 'month' ? 12 : part === 'day' ? 31 : 9999}
            value={birthday?.[part] ?? ''}
            onChange={(e) => {
              const next = {
                month: birthday?.month ?? 0,
                day: birthday?.day ?? 0,
                year: birthday?.year,
                [part]: e.target.value ? Number(e.target.value) : undefined,
              }
              change({
                birthday:
                  !next.month && !next.day && !next.year
                    ? undefined
                    : (next as NewPerson['birthday']),
              })
            }}
          />
        ))}
      </fieldset>
      <label htmlFor="notes">Notes</label>
      <textarea
        id="notes"
        name="notes"
        className="min-h-24 rounded-2xl border bg-surface p-3"
        value={values.notes ?? ''}
        onChange={(e) => change({ notes: e.target.value || undefined })}
      />
    </div>
  )
}
