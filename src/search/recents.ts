// Empty search uses the existing local view field, creation times and active membership counts.
import type { SearchSource } from './documents'
export function recentPeople(source: SearchSource) {
  const people = source.people.filter((p) => !p.deleted && !p.is_me)
  return {
    viewed: people
      .filter((p) => p.last_viewed_at && Number.isFinite(Date.parse(p.last_viewed_at)))
      .sort(
        (a, b) =>
          Date.parse(b.last_viewed_at!) - Date.parse(a.last_viewed_at!) || a.id.localeCompare(b.id),
      )
      .slice(0, 6),
    added: [...people].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
    ),
  }
}
export function popularContexts(source: SearchSource) {
  const activePeople = new Set(source.people.filter((p) => !p.deleted && !p.is_me).map((p) => p.id))
  const counts = new Map<string, Set<string>>()
  for (const membership of source.memberships) {
    if (membership.deleted || !activePeople.has(membership.person_id)) continue
    const people = counts.get(membership.context_id) ?? new Set<string>()
    people.add(membership.person_id)
    counts.set(membership.context_id, people)
  }
  return source.contexts
    .filter((c) => !c.deleted && counts.has(c.id))
    .map((context) => ({ context, count: counts.get(context.id)!.size }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.context.name.localeCompare(b.context.name) ||
        a.context.id.localeCompare(b.context.id),
    )
    .slice(0, 5)
}
