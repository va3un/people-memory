// Local view history is not a contact edit and must not trigger or overwrite stale-edit protection.
import type { Person } from './schema'
export function samePersonRevision(left: Person | undefined, right: Person | undefined): boolean {
  if (!left || !right) return left === right
  const { last_viewed_at: _leftView, ...leftContact } = left
  const { last_viewed_at: _rightView, ...rightContact } = right
  return JSON.stringify(leftContact) === JSON.stringify(rightContact)
}
