// Browsers cannot prove an anchor download completed; reselecting the exact file verifies possession.
import { db } from '../db/database'
import { canonical, fingerprint, readBlob, sha256 } from './codec'
import { readSnapshot, portableDataset } from './snapshot'
import { MAX_FILE_BYTES } from './schema'

export const BACKUP_STATUS_KEY = 'backup:lastVerified'
export type VerifiedStatus = { exported_at: string; verified_at: string }
export type BackupDownload = Readonly<{ blob: Blob; filename: string }>
type Proof = {
  dataFingerprint: string
  fileHash: string
  verified: boolean
  exportedAt: string
}
const proofs = new WeakMap<BackupDownload, Proof>()
export async function prepareBackup(): Promise<BackupDownload> {
  const tables = await portableDataset(await readSnapshot())
  const exportedAt = new Date().toISOString()
  const blob = new Blob(
    [
      JSON.stringify(
        { format: 'people-memory', schema: 1, exported_at: exportedAt, tables },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  )
  if (blob.size > MAX_FILE_BYTES)
    throw new Error('This backup exceeds the 64 MB restore limit. No partial backup was created.')
  const download = Object.freeze({
    blob,
    filename: `people-backup-${exportedAt.replace(/[:.]/g, '-')}.json`,
  })
  proofs.set(download, {
    dataFingerprint: await fingerprint(tables),
    fileHash: await sha256(new Uint8Array(await readBlob(blob))),
    verified: false,
    exportedAt,
  })
  return download
}
export async function verifyBackupDownload(download: BackupDownload, file: Blob): Promise<void> {
  const proof = proofs.get(download)
  if (
    !proof ||
    file.size > MAX_FILE_BYTES ||
    (await sha256(new Uint8Array(await readBlob(file)))) !== proof.fileHash
  )
    throw new Error(
      'Choose the exact safety backup file that was just downloaded. Verification failed; replacement is still blocked.',
    )
  // Write only this application's reminder metadata. Never import or export any device setting.
  const status: VerifiedStatus = {
    exported_at: proof.exportedAt,
    verified_at: new Date().toISOString(),
  }
  await db.deviceSettings.put({
    key: BACKUP_STATUS_KEY,
    value: status,
    updated_at: status.verified_at,
  })
  proof.verified = true
}
export function checkBackupProof(
  download: BackupDownload | undefined,
  expectedFingerprint: string,
  requireVerified = true,
): void {
  const proof = download && proofs.get(download)
  if (
    !proof ||
    proof.dataFingerprint !== expectedFingerprint ||
    (requireVerified && !proof.verified)
  )
    throw new Error('Replacement requires a verified safety backup of the current dataset.')
}
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
export async function readBackupStatus(): Promise<VerifiedStatus | null> {
  const row = await db.deviceSettings.get(BACKUP_STATUS_KEY)
  if (!row?.value || typeof row.value !== 'object') return null
  const value = row.value as VerifiedStatus
  return typeof value.exported_at === 'string' &&
    Number.isFinite(Date.parse(value.exported_at)) &&
    typeof value.verified_at === 'string' &&
    Number.isFinite(Date.parse(value.verified_at))
    ? value
    : null
}
export function backupOverdue(status: VerifiedStatus | null, now = Date.now()): boolean {
  if (!status) return true
  const age = now - Date.parse(status.exported_at)
  return !Number.isFinite(age) || age < 0 || age > 30 * 24 * 60 * 60 * 1000
}
// Shared stable comparison for previews; exporting raw keys is deliberately not part of this API.
export const samePortableRecord = (left: unknown, right: unknown) =>
  canonical(left) === canonical(right)
