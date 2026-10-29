// Undo is atomic and refuses any conflict instead of erasing later edits or links.
import { db } from '../db/database'
import type { CaptureBatch, Person } from '../db/schema'
import { canonical } from '../backup/codec'
import { CAPTURE_TABLES, fields, nextTime } from './save'
export type UndoResult = { undone: boolean; conflicts: string[] }
function comparable(row: Record<string, unknown>) {
  const { last_viewed_at: _view, ...rest } = row
  return canonical(rest)
}
export async function undoCapture(batchId: string): Promise<UndoResult> {
  return db.transaction(
    'rw',
    [db.people, db.contexts, db.memberships, db.relationships, db.photos, db.captureBatches],
    async () => {
      const batch = await db.captureBatches.get(batchId)
      if (!batch || batch.deleted || batch.status === 'undone')
        throw new Error('This capture is unavailable or already undone.')
      const conflicts: string[] = [],
        created = new Set(Object.values(batch.created_ids).flat())
      const [memberships, relationships, photos] = await Promise.all([
        db.memberships.toArray(),
        db.relationships.toArray(),
        db.photos.toArray(),
      ])
      for (const table of CAPTURE_TABLES)
        for (const id of batch.created_ids[table] ?? []) {
          const current = await db.table(table).get(id),
            after = batch.after_snapshots.find((s) => s.table === table && s.id === id)?.values
          if (
            !current ||
            !after ||
            current.source_batch_id !== batchId ||
            comparable(current) !== comparable(after)
          )
            conflicts.push(
              `${table}: ${current?.full_name ?? current?.name ?? id} was changed after capture.`,
            )
          if (
            table === 'people' &&
            (memberships.some((m) => !created.has(m.id) && m.person_id === id) ||
              relationships.some(
                (r) => !created.has(r.id) && (r.person_id === id || r.relative_id === id),
              ) ||
              photos.some((p) => !created.has(p.id) && p.person_id === id))
          )
            conflicts.push(`A later record links to ${current?.full_name ?? id}.`)
          if (
            table === 'contexts' &&
            memberships.some((m) => !created.has(m.id) && m.context_id === id)
          )
            conflicts.push(`A later membership uses ${current?.name ?? id}.`)
        }
      for (const before of batch.before_snapshots) {
        if (before.table !== 'people') {
          conflicts.push('Unsupported capture history requires manual review.')
          continue
        }
        const after = batch.after_snapshots.find(
          (s) => s.table === before.table && s.id === before.id,
        )?.values
        const current = await db.people.get(before.id)
        if (
          !after ||
          !current ||
          current.deleted ||
          current.id !== after.id ||
          current.created_at !== after.created_at
        ) {
          conflicts.push('A previously filled person is missing or changed identity.')
          continue
        }
        for (const field of fields)
          if (
            canonical(before.values[field]) !== canonical(after[field]) &&
            canonical(current[field]) !== canonical(after[field])
          )
            conflicts.push(`${current.full_name}: ${field} was edited later.`)
      }
      if (conflicts.length) {
        await db.captureBatches.put({
          ...batch,
          status: 'undo_conflict',
          updated_at: nextTime(batch.updated_at),
        })
        return { undone: false, conflicts }
      }
      for (const before of batch.before_snapshots) {
        const current = (await db.people.get(before.id))!,
          after = batch.after_snapshots.find(
            (s) => s.table === before.table && s.id === before.id,
          )!.values
        const next = { ...current } as Person
        for (const field of fields)
          if (canonical(before.values[field]) !== canonical(after[field])) {
            if (Object.hasOwn(before.values, field))
              Object.assign(next, { [field]: before.values[field] })
            else delete next[field]
          }
        next.updated_at = nextTime(current.updated_at)
        await db.people.put(next)
      }
      for (const table of CAPTURE_TABLES)
        for (const id of batch.created_ids[table] ?? []) {
          const row = await db.table(table).get(id)
          await db.table(table).put({ ...row, deleted: true, updated_at: nextTime(row.updated_at) })
        }
      await db.captureBatches.put({
        ...batch,
        status: 'undone',
        updated_at: nextTime(batch.updated_at),
      })
      return { undone: true, conflicts: [] }
    },
  )
}
export async function listCaptureBatches(): Promise<CaptureBatch[]> {
  return (await db.captureBatches.filter((b) => !b.deleted).toArray()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
}
