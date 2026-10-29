// Pure record merge detects independent changes against the last acknowledged baseline and preserves both versions.
import { DATA_TABLES, type DataTable, type PortableTables } from '../backup/schema'
import { rowKey, type Prepared } from './model'
export type Conflict = {
  table: DataTable
  id: string
  winner: Record<string, unknown>
  loser: Record<string, unknown>
  winnerHash: string
  loserHash: string
}
export function merge(local: Prepared, remote: Prepared, baseline: Record<string, string>) {
  const tables = structuredClone(local.tables),
    conflicts: Conflict[] = []
  for (const table of DATA_TABLES) {
    const left = new Map(local.tables[table].map((r) => [r.id, r])),
      right = new Map(remote.tables[table].map((r) => [r.id, r]))
    const rows: unknown[] = []
    for (const id of [...new Set([...left.keys(), ...right.keys()])].sort()) {
      const a = left.get(id),
        b = right.get(id),
        key = rowKey(table, id)
      if (!a || !b) {
        rows.push(a ?? b)
        continue
      } // Missing rows never imply deletion; only explicit tombstones do.
      const ah = local.hashes[key],
        bh = remote.hashes[key],
        base = baseline[key]
      if (ah === bh) {
        rows.push(a)
        continue
      }
      const ac = ah !== base,
        bc = bh !== base
      let chooseA: boolean
      if (base && ac !== bc)
        chooseA = ac // A single known change wins even when its clock is behind.
      else {
        const at = Date.parse(a.updated_at),
          bt = Date.parse(b.updated_at)
        chooseA = at === bt ? ah > bh : at > bt
        conflicts.push({
          table,
          id,
          winner: structuredClone(chooseA ? a : b),
          loser: structuredClone(chooseA ? b : a),
          winnerHash: chooseA ? ah : bh,
          loserHash: chooseA ? bh : ah,
        })
      }
      rows.push(chooseA ? a : b)
    }
    ;(tables[table] as unknown[]) = rows
  }
  return { tables: tables as PortableTables, conflicts }
}
